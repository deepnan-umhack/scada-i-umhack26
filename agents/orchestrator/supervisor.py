from typing import Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, SystemMessage, trim_messages
from langgraph.graph import StateGraph, END
import os
from dotenv import load_dotenv, find_dotenv

# --- POSTGRES MEMORY IMPORTS ---
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Import your state and workers
from state import AgentState
from booking_agent.booking_agent import booking_worker
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

    token_counter_llm = ChatOpenAI(model="gpt-4o-mini")

    # 2. Trim the messages BEFORE handing them to the worker
    trimmed_history = trim_messages(
        state["messages"],
        max_tokens=4000, 
        strategy="last",
        token_counter=token_counter_llm,
        include_system=False 
    )

    # 3. Hand the worker ONLY the safely trimmed history
    safe_state = {"messages": trimmed_history}
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
    print("\n[SUPERVISOR] 🤔 Thinking about the next move...")

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(RouterSchema)
    
    # FIX 3: Added the prompt and the actual LLM execution
    # system_prompt = SystemMessage(content=(
    #     "You are the Lead Facilities Orchestrator. Your job is to manage a team of specialists to solve complex user requests. "
    #     "You do not execute tasks yourself; you delegate them by issuing specific commands to your workers and reviewing their internal reports.\n\n"
        
    #     "TEAM DIRECTORY:\n"
    #     "- BOOKING_NODE: Executes room reservations, checks availability, and manages physical equipment.\n"
    #     "- ESG_NODE: Evaluates requests for sustainability compliance, carbon limits, and energy policies.\n"
    #     "- HVAC_NODE: Adjusts physical room environments, temperature, and smart lighting.\n\n"
        
    #     "ORCHESTRATION RULES (CRITICAL):\n"
    #     "1. STEP-BY-STEP DECOMPOSITION: If a user asks for multiple things (e.g., 'Book a room and set AC to 16C'), handle one step at a time. "
    #     "Route to the most logical first node (e.g., check ESG compliance before booking the room).\n"
    #     "2. ISSUE EXPLICIT COMMANDS: Never just route to a node. You must provide a clear 'command' telling the worker exactly what you need them to do or evaluate.\n"
    #     "3. CONFLICT RESOLUTION: If you route to a worker and their internal report shows a failure or policy violation (e.g., ESG rejects the 16C request), "
    #     "do NOT proceed with the rest of the user's plan. Route to SYNTHESIZER to inform the user of the blockage.\n"
    #     "4. ITERATIVE COLLABORATION: You can route back and forth. If HVAC proposes an energy output, you can route to ESG to approve it, and then back to HVAC if it needs adjusting.\n"
    #     "5. THE FINISH LINE: Only route to SYNTHESIZER when all parts of the user's request have been successfully completed by the workers, or if a hard blockage requires user input."
    # ))

    system_prompt = SystemMessage(content=(
        "You are the Lead Facilities Orchestrator. Your job is to manage a scheduling specialist to solve user requests. "
        "You do not execute tasks yourself; you delegate them by issuing specific commands to your worker and reviewing their internal reports.\n\n"
        
        "TEAM DIRECTORY:\n"
        "- BOOKING_NODE: Executes room reservations, checks room availability, and manages physical equipment inventory.\n\n"
        
        "ORCHESTRATION RULES (CRITICAL):\n"
        "1. LOGICAL DECOMPOSITION: If a user's request is complex, handle it logically. For example, command the worker to check room availability first before issuing a second command to actually create the booking.\n"
        "2. ISSUE EXPLICIT COMMANDS: Never just route to a node. You must provide a clear 'command' telling the worker exactly what you need them to do or evaluate based on the user's prompt.\n"
        "3. CONFLICT RESOLUTION: If you route to the worker and their internal report shows a failure (e.g., the room is already booked, or the equipment is out of stock), "
        "do NOT proceed. Route to SYNTHESIZER to inform the user of the blockage and ask how they want to proceed.\n"
        "4. THE FINISH LINE: Only route to SYNTHESIZER when the user's request has been successfully completed by the worker, or if a blockage requires user input (e.g., asking them to pick from a list of available rooms)."
    ))
    
    trimmed_messages = trim_messages(
        state["messages"],
        max_tokens=4000, 
        strategy="last",
        token_counter=llm,
        include_system=False # We inject the system prompt manually below
    )
    
    messages_to_send = [system_prompt] + trimmed_messages
    decision = await structured_llm.ainvoke(messages_to_send)
    
    print(f"[SUPERVISOR] 🎯 Routing to {decision.next} with command: {decision.command}")
    
    # If the decision is to synthesize, we don't need to issue a command to the workers
    if decision.next == "SYNTHESIZER":
        return {"next": decision.next}
    
    # Create the Boss's instruction so the worker knows exactly what to do
    boss_instruction = SystemMessage(
        content=f"[SUPERVISOR COMMAND]: {decision.command}",
        name="Supervisor"
    )
    
    # Return both the routing direction AND the command to be added to the state
    return {
        "next": decision.next,
        "messages": [boss_instruction]
    }

# ==========================================
# 3. THE SYNTHESIZER (The Mouth)
# ==========================================
async def synthesizer_node(state: AgentState) -> dict:
    """Reads all internal worker reports and writes a polite reply to the user."""
    print("\n[SYNTHESIZER] ✍️ Drafting final response to user...")
    
    llm = ChatOpenAI(model="gpt-4o") # Use a smarter model for writing
    
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
        token_counter=llm,
        include_system=False
    )

    messages_to_send = [system_prompt] + list(state["messages"])
    response = await llm.ainvoke(messages_to_send)
    
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