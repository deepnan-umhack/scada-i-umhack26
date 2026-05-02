import os
import json
from importlib import import_module
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse # <-- ADDED for streaming
from pydantic import BaseModel
from contextlib import asynccontextmanager
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv, find_dotenv

# --- HIGH PERFORMANCE POSTGRES IMPORTS ---
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Import the RAW, uncompiled workflow from your orchestrator
from orchestrator.supervisor import workflow

# Load environment variables
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# Global variables to hold our fast, compiled app and DB connection
compiled_app = None

# --- LIFESPAN MANAGER (The Enterprise Setup) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global compiled_app
    
    print("⏳ Starting up: Initializing high-speed DB Pool...")
    
    async with AsyncConnectionPool(conninfo=DATABASE_URL) as pool:
        memory = AsyncPostgresSaver(pool)
        
        # Ensure tables exist in Postgres
        await memory.setup()
        
        # Compile the graph ONCE and hold it in RAM
        compiled_app = workflow.compile(checkpointer=memory)
        print("✅ FastAPI Server ready to receive React traffic!")
        
        yield 
        
    print("🛑 Shutting down: DB Pool closed automatically.")

# Initialize FastAPI
api = FastAPI(title="Facilities Orchestrator API", lifespan=lifespan)

# --- CORS CONFIGURATION ---
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA SCHEMA ---
class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_id: str

# --- ASYNC GENERATOR FOR SSE STREAMING ---
async def stream_agent_actions(app, messages_dict, config):
    """
    Executes the compiled graph and yields Server-Sent Events (SSE) 
    as each node finishes its task.
    """
    try:
        # stream_mode="updates" yields output after every node
        async for event in app.astream(messages_dict, config=config, stream_mode="updates"):
            for node_name, node_output in event.items():
                
                # 1. Capture the Supervisor
                if node_name == "supervisor":
                    next_node = node_output.get("next", "UNKNOWN")
                    command_text = node_output["messages"][-1].content
                    
                    yield f"data: {json.dumps({
                        'type': 'thought',
                        'agent': 'Supervisor',
                        'action': f'Routing to {next_node}',
                        'details': command_text
                    })}\n\n"
                
                # 2. Capture Worker Agents
                elif node_name in ["booking_node", "hvac_node", "esg_node"]:
                    report_text = node_output["messages"][-1].content
                    friendly_name = node_name.replace("_node", "").upper()
                    
                    yield f"data: {json.dumps({
                        'type': 'action',
                        'agent': f'{friendly_name} Agent',
                        'action': 'Task Completed',
                        'details': report_text
                    })}\n\n"
                
                # 3. Capture Synthesizer
                elif node_name == "synthesizer":
                    final_reply = node_output["messages"][-1].content
                    
                    yield f"data: {json.dumps({
                        'type': 'final_response',
                        'agent': 'Synthesizer',
                        'details': final_reply
                    })}\n\n"

        # Signal frontend that processing is complete
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        # Catch graph crashes and stream the error to the frontend
        yield f"data: {json.dumps({'type': 'error', 'details': str(e)})}\n\n"


# --- THE CHAT ENDPOINT ---
@api.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if compiled_app is None:
        raise HTTPException(status_code=503, detail="Service is still starting up. Please retry shortly.")

    # Secretly inject the user ID into the prompt
    backend_prompt = f"{request.message}\n[SYSTEM NOTE: The current user's ID is '{request.user_id}']"
    
    messages_dict = {"messages": [HumanMessage(content=backend_prompt)]}
    
    # Tell LangGraph which memory folder to open
    config = {"configurable": {"thread_id": request.thread_id}}
    
    # Return the SSE stream to React immediately
    return StreamingResponse(
        stream_agent_actions(compiled_app, messages_dict, config),
        media_type="text/event-stream"
    )