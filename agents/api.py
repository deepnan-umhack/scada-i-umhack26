import asyncio
import selectors

# MUST be before any other imports
asyncio.set_event_loop(asyncio.SelectorEventLoop(selectors.SelectSelector()))

import os
import uvicorn
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
from orchestrator.supervisor import workflow

# Load environment variables (for local testing)
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
        
        # Ensure tables exist in Supabase
        await memory.setup()
        
        # Compile the graph ONCE and hold it in RAM
        compiled_app = workflow.compile(checkpointer=memory)
        print("✅ FastAPI Server ready to receive React traffic!")
        
        yield 
        
    print("🛑 Shutting down: DB Pool closed automatically.")

# Initialize FastAPI with the lifespan
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

# --- THE CHAT ENDPOINT ---
@api.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        if compiled_app is None:
            raise HTTPException(status_code=503, detail="Service is still starting up. Please retry shortly.")

        backend_prompt = f"{request.message}\n[SYSTEM NOTE: The current user's ID is '{request.user_id}']"
        config = {"configurable": {"thread_id": request.thread_id}}
        
        result = await compiled_app.ainvoke(
            {"messages": [HumanMessage(content=backend_prompt)]}, 
            config=config
        )
        
        final_reply = result["messages"][-1].content
        return {"reply": final_reply}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ENTRY POINT ---
async def main():
    server = uvicorn.Server(uvicorn.Config(
        "api:api",
        host="0.0.0.0",
        port=8000,
        reload=False,
    ))
    await server.serve()

if __name__ == "__main__":
    asyncio.run(
        main(),
        loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector())
    )