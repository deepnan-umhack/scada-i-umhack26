from typing import Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, trim_messages
from langgraph.graph import StateGraph, END
import os
from dotenv import load_dotenv, find_dotenv

# --- POSTGRES MEMORY IMPORTS ---
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Import your state and workers
from state import AgentState
from booking_agent.booking_agent import booking_worker
from orchestrator.prompts import build_supervisor_prompt
# from esg_agent import esg_worker     # Uncomment when ready
# from hvac_agent import hvac_worker   # Uncomment when ready

# Load env variables (searching parent directories to avoid the folder trap!)
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ==========================================
# 1. THE WORKER WRAPPERS (The Hands)
# ==========================================
async def booking_node(state: AgentState) -> dict:
    """Adapter node for the Booking Agent. Enforces Context Isolation."""
    print('\n[ROUTER] 🔀 Routing to Booking Agent')

    token_counter_llm = ChatOpenAI(model="gpt-4o-mini", api_key=os.getenv("Z_AI_API_KEY"),)

    # 2. Extract ONLY the Supervisor's command (the very last message in the state)
    boss_command = state["messages"][-1]

    latest_user_prompt = None
    for msg in reversed(state["messages"]):
        if getattr(msg, "type", None) == "human" and getattr(msg, "content", None):
            latest_user_prompt = str(msg.content)
            break

    # 3. Hand the worker ONLY the command, blinding it to the rest of the chat history
    safe_messages = [boss_command]
    if latest_user_prompt:
        safe_messages.append(
            HumanMessage(
                content=f"[USER REQUEST CONTEXT]: {latest_user_prompt}",
                name="User_Context"
            )
        )
    safe_state = {"messages": safe_messages}
    
    # 4. Execute the worker
    result = await booking_worker.ainvoke(safe_state)

    # FIX 1: Changed 'message' to 'messages' (LangGraph uses plural)
    final_message = result['messages'][-1]

    # Repackage to global state to know who is talking
    clean_message = AIMessage(
        content=final_message.content,
        name='Booking_Agent'
    )

    return {"messages": [clean_message]}

# ==========================================
# 2. THE SUPERVISOR (The Brain)
# ==========================================
# FIX 2: Replaced "FINISH" with "SYNTHESIZER" for our General Manager pattern
class RouterSchema(BaseModel):
    # next: Literal["BOOKING_NODE", "ESG_NODE", "HVAC_NODE", "SYNTHESIZER"] = Field(
    next: Literal["BOOKING_NODE", "SYNTHESIZER"] = Field(
        ..., 
        description="The next agent to route to, or SYNTHESIZER if all tasks are done or if you need to reply to the user."
    )
    command: str = Field(
        ..., description="A specific, direct instruction telling the targeted worker exactly what to do or evaluate."
    )   

async def supervisor_node(state: AgentState) -> dict:
    """The Orchestrator. Reads the conversation and decides the next move."""
    print("\n[SUPERVISOR] 🤔 Thinking about the next move (GLM Rumination ON)...")

    # 1. SETUP THE LLM WITH THE ESCAPE HATCH
    glm_llm = ChatOpenAI(
        model="ilmu-glm-5.1",
        api_key=os.getenv("Z_AI_API_KEY"),
        base_url=os.getenv("Z_AI_BASE_URL"), 
        temperature=0,
        extra_body={  # Bypasses the strict OpenAI SDK validation
            "thinking": {"type": "enabled"} # Triggers the server-side reasoning
        }
    )

    token_counter_llm = ChatOpenAI(model="gpt-4o-mini", api_key=os.getenv("Z_AI_API_KEY"),)

    # 2. SETUP THE ROBUST OUTPUT PARSER
    from langchain_core.output_parsers import PydanticOutputParser
    parser = PydanticOutputParser(pydantic_object=RouterSchema)
    
    # 3. THE PROMPT (Notice the parser instructions injected at the very bottom!)
    system_prompt = SystemMessage(
        content=build_supervisor_prompt(parser.get_format_instructions())
    )
    
    # 4. TRIM MESSAGES TO PROTECT CONTEXT WINDOW
    trimmed_messages = trim_messages(
        state["messages"],
        max_tokens=4000, 
        strategy="last",
        token_counter=token_counter_llm,
        include_system=False 
    )
    
    messages_to_send = [system_prompt] + trimmed_messages
    
    # 5. EXECUTE THE LLM CALL (Using standard text format to avoid tool_call crashes)
    raw_result = await glm_llm.ainvoke(messages_to_send)
    
    # 6. PARSE THE RESPONSE (Strips away Markdown backticks safely)
    try:
        decision = parser.invoke(raw_result)
    except Exception as e:
        print(f"[SUPERVISOR ERROR] Failed to parse GLM response. Forcing fallback to SYNTHESIZER. Error: {e}")
        # Safe fallback so your whole app doesn't crash if the model hallucinates
        return {"next": "SYNTHESIZER"}
    
    print(f"[SUPERVISOR] 🎯 Routing to {decision.next} with command: {decision.command}")
    
    # 7. ROUTING LOGIC
    if decision.next == "SYNTHESIZER":
        return {"next": decision.next}
    
    boss_instruction = SystemMessage(
        content=f"[SUPERVISOR COMMAND]: {decision.command}",
        name="Supervisor"
    )
    
    return {
        "next": decision.next,
        "messages": [boss_instruction]
    }

# ==========================================
# 3. THE SYNTHESIZER (The Mouth)
# ==========================================
async def synthesizer_node(state: AgentState) -> dict:
    """Reads all internal worker reports and writes a polite reply to the user."""
    print("\n[SYNTHESIZER] ✍️ Drafting final response to user (GLM ON)...")
    
    glm_llm = ChatOpenAI(
        model="ilmu-glm-5.1",
        api_key=os.getenv("Z_AI_API_KEY"),
        base_url=os.getenv("Z_AI_BASE_URL"), 
        temperature=0,
        extra_body={
            "thinking": {"type": "enabled"}
        }
    )

    token_counter_llm = ChatOpenAI(model="gpt-4o-mini", api_key=os.getenv("Z_AI_API_KEY"),)
    
    system_prompt = SystemMessage(content=(
        "You are the polite customer-facing voice of a Facilities Management system. "
        "Review the conversation history and the internal reports from your backend workers (Booking, ESG, HVAC). "
        "Synthesize their findings into a single, cohesive, polite response to the user. "
        "Do not mention that you are passing information between agents. Just deliver the final result."
    ))
    
    trimmed_messages = trim_messages(
        state["messages"],
        max_tokens=4000, 
        strategy="last",
        token_counter=token_counter_llm,
        include_system=False
    )

    messages_to_send = [system_prompt] + trimmed_messages
    response = await glm_llm.ainvoke(messages_to_send)
    
    return {"messages": [response]}

# ==========================================
# 4. THE WORKFLOW GRAPH (The Assembly Line)
# ==========================================
# This goes at the bottom! It wires everything together.

workflow = StateGraph(AgentState)

# Add all the nodes to the graph
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("booking_node", booking_node)
# workflow.add_node("esg_node", esg_node)     # Uncomment when ready
# workflow.add_node("hvac_node", hvac_node)   # Uncomment when ready
workflow.add_node("synthesizer", synthesizer_node)

# Set the entry point: Every conversation starts at the boss
workflow.set_entry_point("supervisor")

# Conditional Routing: The boss decides where to go
workflow.add_conditional_edges(
    "supervisor",
    lambda x: x["next"],
    {
        "BOOKING_NODE": "booking_node",
        "SYNTHESIZER": "synthesizer"
    }
)

# Return Edges: Workers ALWAYS report back to the Boss after finishing their task
workflow.add_edge("booking_node", "supervisor")
# workflow.add_edge("esg_node", "supervisor")   # Uncomment when ready
# workflow.add_edge("hvac_node", "supervisor")  # Uncomment when ready

# The Synthesizer is the final step; it ends the graph execution
workflow.add_edge("synthesizer", END)

# ==========================================
# 5. ENTERPRISE POSTGRES MEMORY SETUP
# ==========================================
# Create a connection pool that stays open for fast routing
async def setup_database():
    """Run this once on startup to create the checkpoints tables."""
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
        await memory.setup()
        print("✅ Postgres Checkpointer Tables Verified!")

async def run_graph(messages_dict, config):
    """Safely opens a DB connection, compiles the graph, runs it, and closes the connection."""
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
        # We compile the app ON DEMAND inside the safe database context
        app = workflow.compile(checkpointer=memory)
        
        # Run the agent
        result = await app.ainvoke(messages_dict, config=config)
        return result