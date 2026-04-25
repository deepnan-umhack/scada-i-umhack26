import os
from importlib import import_module
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv, find_dotenv

# --- HIGH PERFORMANCE POSTGRES IMPORTS ---
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Import the RAW, uncompiled workflow from your orchestrator
try:
    from orchestrator.supervisor import workflow
except ImportError:
    # Fallback for running from within the orchestrator module context
    workflow = import_module("supervisor").workflow

# Load environment variables (for local testing)
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# Global variables to hold our fast, compiled app and DB connection
compiled_app = None
db_pool = None

# --- LIFESPAN MANAGER (The Enterprise Setup) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global compiled_app
    
    print("⏳ Starting up: Initializing high-speed DB Pool...")
    
    # 🚀 FIX: Use 'async with' to properly open the pool
    async with AsyncConnectionPool(conninfo=DATABASE_URL) as pool:
        memory = AsyncPostgresSaver(pool)
        
        # Ensure tables exist in Supabase
        await memory.setup()
        
        # Compile the graph ONCE and hold it in RAM
        compiled_app = workflow.compile(checkpointer=memory)
        print("✅ FastAPI Server ready to receive React traffic!")
        
        # The server runs and handles traffic while inside this block!
        yield 
        
    # When the server shuts down, the 'async with' block ends 
    # and the pool automatically closes itself. No manual closing needed!
    print("🛑 Shutting down: DB Pool closed automatically.")

# Initialize FastAPI with the lifespan
api = FastAPI(title="Facilities Orchestrator API", lifespan=lifespan)

# --- CORS CONFIGURATION ---
# This allows your friend's React app to talk to your API without security blocks
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows any React URL (localhost, Vercel, etc.)
    # Must be False when allow_origins is ["*"] per CORS spec behavior in browsers
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA SCHEMA ---
# This defines exactly what the React app MUST send you
class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_id: str

# --- THE CHAT ENDPOINT ---
@api.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        if compiled_app is None:
            raise HTTPException(status_code=503, detail="Service is still starting up. Please retry shortly.")

        # Secretly inject the user ID into the prompt for the Booking Worker
        backend_prompt = f"{request.message}\n[SYSTEM NOTE: The current user's ID is '{request.user_id}']"
        
        # Tell LangGraph which memory folder to open
        config = {"configurable": {"thread_id": request.thread_id}}
        
        # 🚀 Execute the fast, compiled app!
        result = await compiled_app.ainvoke(
            {"messages": [HumanMessage(content=backend_prompt)]}, 
            config=config
        )
        
        # Extract the final Synthesizer reply
        final_reply = result["messages"][-1].content
        
        # Send it back to React as JSON
        return {"reply": final_reply}
        
    except Exception as e:
        # If something crashes, send the error cleanly back to React
        raise HTTPException(status_code=500, detail=str(e))