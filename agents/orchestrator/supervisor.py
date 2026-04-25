from typing import Literal
from pydantic import BaseModel, Field
from langchain_deepseek import ChatDeepSeek
from langchain_openai import ChatOpenAI # <-- Added OpenAI import
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, trim_messages
from langgraph.graph import StateGraph, END
import os
import tiktoken
from dotenv import load_dotenv, find_dotenv

# --- POSTGRES MEMORY IMPORTS ---
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Import your state and workers
from state import AgentState
from booking_agent.booking_agent import booking_worker
from orchestrator.prompts import build_supervisor_prompt

# ---------------------------------------------------------
# IMPORTS: Stateless workers
# ---------------------------------------------------------
from hvac_agent.hvac_agent import hvac_worker
from esg_agent.esg_agent import run_esg_worker        

# Load env variables
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ==========================================
# HELPER: Local Token Counter
# ==========================================
def local_token_counter(messages: list) -> int:
    # FIX: Updated to gpt-4o tokenizer
    encoding = tiktoken.encoding_for_model("gpt-4o")
    return sum(len(encoding.encode(str(msg.content))) for msg in messages)

# ==========================================
# 1. THE WORKER WRAPPERS (The Hands)
# ==========================================
async def booking_node(state: AgentState) -> dict:
    """Adapter node for the Booking Agent."""
    print('\n[ROUTER] 🔀 Routing to Booking Agent')

    boss_message = state["messages"][-1]
    latest_user_prompt = next((str(msg.content) for msg in reversed(state["messages"]) if getattr(msg, "type", None) == "human" and getattr(msg, "content", None)), None)

    combined_content = ""
    if latest_user_prompt:
        combined_content += f"[USER REQUEST CONTEXT]: {latest_user_prompt}\n\n"
    combined_content += f"[SUPERVISOR COMMAND]: {boss_message.content}"
    
    # FIX: Changed to SystemMessage
    safe_messages = [SystemMessage(content=combined_content)]
    
    result = await booking_worker.ainvoke({"messages": safe_messages})
    final_message = result['messages'][-1]

    clean_message = AIMessage(content=final_message.content, name='Booking_Agent')
    return {"messages": [clean_message]}


async def hvac_node(state: AgentState) -> dict:
    """Adapter node for the HVAC Agent."""
    print('\n[ROUTER] 🔀 Routing to HVAC Agent')

    boss_message = state["messages"][-1]
    latest_user_prompt = next((str(msg.content) for msg in reversed(state["messages"]) if getattr(msg, "type", None) == "human" and getattr(msg, "content", None)), None)

    combined_content = ""
    if latest_user_prompt:
        combined_content += f"[USER REQUEST CONTEXT]: {latest_user_prompt}\n\n"
    combined_content += f"[SUPERVISOR COMMAND]: {boss_message.content}"

    # FIX: Changed to SystemMessage
    safe_messages = [SystemMessage(content=combined_content)]

    result = await hvac_worker.ainvoke({"messages": safe_messages})
    final_message = result['messages'][-1]

    clean_message = AIMessage(content=final_message.content, name='HVAC_Agent')
    return {"messages": [clean_message]}


async def esg_node(state: AgentState) -> dict:
    """Adapter node for the ESG Agent."""
    print('\n[ROUTER] 🔀 Routing to ESG Agent')

    boss_message = state["messages"][-1]
    latest_user_prompt = next((str(msg.content) for msg in reversed(state["messages"]) if getattr(msg, "type", None) == "human" and getattr(msg, "content", None)), None)

    combined_content = ""
    if latest_user_prompt:
        combined_content += f"[USER REQUEST CONTEXT]: {latest_user_prompt}\n\n"
    combined_content += f"[SUPERVISOR COMMAND]: {boss_message.content}"

    # FIX: Changed to SystemMessage
    safe_messages = [SystemMessage(content=combined_content)]

    final_message = await run_esg_worker(safe_messages)

    clean_message = AIMessage(content=final_message.content, name='ESG_Agent')
    return {"messages": [clean_message]}

# ==========================================
# 2. THE SUPERVISOR (The Brain)
# ==========================================
class RouterSchema(BaseModel):
    next: Literal["BOOKING_NODE", "HVAC_NODE", "ESG_NODE", "SYNTHESIZER"] = Field(
        ..., 
        description="The next agent to route to, or SYNTHESIZER if all tasks are done."
    )
    command: str = Field(
        ..., description="Specific directive for the worker."
    )   

async def supervisor_node(state: AgentState) -> dict:
    print("\n[SUPERVISOR] 🤔 Thinking about the next move (GPT-4o ON)...")

    # FIX: Switched to GPT-4o
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

    structured_llm = llm.with_structured_output(RouterSchema)
    
    trimmed_messages = trim_messages(
        state["messages"],
        max_tokens=4000, 
        strategy="last",
        token_counter=local_token_counter,
        include_system=False 
    )
    
    system_prompt = SystemMessage(content=build_supervisor_prompt())
    messages_to_send = [system_prompt] + trimmed_messages
    
    try:
        decision = await structured_llm.ainvoke(messages_to_send)
    except Exception as e:
        print(f"[SUPERVISOR ERROR] Routing failed: {e}")
        return {"next": "SYNTHESIZER", "messages": [AIMessage(content="Routing error, fallback to synthesis.", name="Supervisor")]}
    
    print(f"[SUPERVISOR] 🎯 Routing to {decision.next}")
    
    return {"next": decision.next, "messages": [AIMessage(content=decision.command, name="Supervisor")]}

# ==========================================
# 3. THE SYNTHESIZER (The Mouth)
# ==========================================
async def synthesizer_node(state: AgentState) -> dict:
    print("\n[SYNTHESIZER] ✍️ Drafting final response to user...")
    
    # Synthesizer remains DeepSeek
    llm = ChatDeepSeek(
        model="deepseek-chat",
        temperature=0,
        api_key=os.getenv("DEEPSEEK_API_KEY"),
    )
    
    system_prompt = SystemMessage(content="""You are the polite customer-facing voice...""")
    
    trimmed_messages = trim_messages(
        state["messages"], 
        max_tokens=4000, 
        strategy="last", 
        token_counter=local_token_counter, 
        include_system=False
    )
    
    messages_to_send = [system_prompt] + trimmed_messages
    response = await llm.ainvoke(messages_to_send)
    
    return {"messages": [response]}

# ==========================================
# 4. THE WORKFLOW GRAPH
# ==========================================
workflow = StateGraph(AgentState)

workflow.add_node("supervisor", supervisor_node)
workflow.add_node("booking_node", booking_node)
workflow.add_node("hvac_node", hvac_node)
workflow.add_node("esg_node", esg_node)          
workflow.add_node("synthesizer", synthesizer_node)

workflow.set_entry_point("supervisor")

workflow.add_conditional_edges(
    "supervisor",
    lambda x: x["next"],
    {
        "BOOKING_NODE": "booking_node",
        "HVAC_NODE": "hvac_node",
        "ESG_NODE": "esg_node",                  
        "SYNTHESIZER": "synthesizer"
    }
)

workflow.add_edge("booking_node", "supervisor")
workflow.add_edge("hvac_node", "supervisor")
workflow.add_edge("esg_node", "supervisor")      
workflow.add_edge("synthesizer", END)

# ==========================================
# 5. RUNTIME WRAPPERS
# ==========================================
async def setup_database():
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
        await memory.setup()

async def run_graph(messages_dict, config):
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
        app = workflow.compile(checkpointer=memory)
        return await app.ainvoke(messages_dict, config=config)