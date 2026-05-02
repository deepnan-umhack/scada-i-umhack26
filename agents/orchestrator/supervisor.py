from typing import Literal
from pydantic import BaseModel, Field
from langchain_deepseek import ChatDeepSeek
from langchain_openai import ChatOpenAI # <-- Added OpenAI import
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, trim_messages
from langgraph.graph import StateGraph, END
import os
import tiktoken
from dotenv import load_dotenv, find_dotenv
import json

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
        max_tokens=2000, 
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
    
    system_prompt = SystemMessage(content="""
        You are the polite customer-facing voice of a Facilities Management system.
        Review the conversation history and the internal reports from your backend workers (Booking, ESG, HVAC).
        Synthesize their findings into a single, cohesive, polite response to the user.
        Do not mention that you are passing information between agents. Just deliver the final result.
        If the Supervisor passes you a direct command or question to ask the user, you MUST ask the user exactly that.
        Do NOT invent or assume successful actions that are not present in the internal reports.

        For all user-facing date/time output, default to Malaysia time (Asia/Kuala_Lumpur, MYT).
        If worker reports contain UTC fields like start_time_utc/end_time_utc/pre_cool_start, convert and present them in MYT.
        Do NOT present UTC-first phrasing unless the user explicitly asks for UTC.
                                  
        HUMAN OVERRIDE & WHATSAPP PROTOCOL:
        1. Whenever a report indicates that a "Human Action", "Manual Override", or "PTJ Approval" is required or user request to contact admin, you MUST provide the user with the official WhatsApp link for the Facilities Management Team.
        2. Use this exact format: 
        "To proceed with this request, please contact the Facilities Officer via WhatsApp: [Contact via WhatsApp](https://wa.me/60123456789?text=I%20need%20an%20HVAC%20override%20for%20the%20Auditorium%20on%20Sunday)"
        3. Friendly Note: Always explain *why* they need to click the link (e.g., 'Since this requires formal approval from the Energy Officer...').

        CRITICAL OVERRIDE RULES:
        1. If the input data from the Orchestrator indicates "Access Denied", "AUTH_DENIED", or an authorization failure:
        2. DO NOT apologize. DO NOT ask the user anything else.
        3. Output EXACTLY this string:
        Access Denied: You do not have the required administrative permissions for this action.""")
    
    trimmed_messages = trim_messages(
        state["messages"], 
        max_tokens=2000, 
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
    """
    Streams the internal actions and final response of the agents.
    Yields Server-Sent Events (SSE) formatted strings.
    """
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
        app = workflow.compile(checkpointer=memory)
        
        # stream_mode="updates" yields the state output after EVERY node finishes executing
        async for event in app.astream(messages_dict, config=config, stream_mode="updates"):
            
            # 'event' is a dictionary where the key is the Node Name
            for node_name, node_output in event.items():
                
                # 1. Capture the Supervisor's routing and command
                if node_name == "supervisor":
                    # Grab the destination node from the state
                    next_node = node_output.get("next", "UNKNOWN")
                    # Grab the actual command it issued
                    command_text = node_output["messages"][-1].content
                    
                    yield f"data: {json.dumps({
                        'type': 'thought',
                        'agent': 'Supervisor',
                        'action': f'Routing to {next_node}',
                        'details': command_text
                    })}\n\n"
                
                # 2. Capture Worker Agent Reports
                elif node_name in ["booking_node", "hvac_node", "esg_node"]:
                    # Grab the report text generated by the worker
                    report_text = node_output["messages"][-1].content
                    friendly_name = node_name.replace("_node", "").upper()
                    
                    yield f"data: {json.dumps({
                        'type': 'action',
                        'agent': f'{friendly_name} Agent',
                        'action': 'Task Completed',
                        'details': report_text
                    })}\n\n"
                
                # 3. Capture the Final Synthesizer Output
                elif node_name == "synthesizer":
                    final_reply = node_output["messages"][-1].content
                    
                    yield f"data: {json.dumps({
                        'type': 'final_response',
                        'agent': 'Synthesizer',
                        'details': final_reply
                    })}\n\n"

        # Optional: Signal the frontend that the stream is completely finished
        yield f"data: {json.dumps({'type': 'done'})}\n\n"