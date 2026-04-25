import asyncio
import uuid
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# Force load environment variables for LangSmith tracing
load_dotenv()

# Import your compiled graph from supervisor.py
from supervisor import app

async def chat_turn(user_input: str, thread_id: str):
    """
    Simulates a single turn of conversation.
    Passes the thread_id to ensure LangGraph loads the correct memory.
    """
    print(f"\n👤 USER: {user_input}")
    print("-" * 60)
    
    # This config dictates which "Save File" the Orchestrator loads
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # ainvoke will run the graph until it hits END (after the Synthesizer)
        result = await app.ainvoke(
            {"messages": [HumanMessage(content=user_input)]}, 
            config=config
        )
        
        # The final reply should be the last message in the state (from the Synthesizer)
        final_message = result["messages"][-1].content
        print("\n" + "=" * 60)
        print(f"🤖 SYSTEM REPLY:\n{final_message}")
        print("=" * 60 + "\n")
        
    except Exception as e:
        print(f"\n❌ SYSTEM ERROR: {e}\n")


async def run_evaluation():
    print("🚀 STARTING ORCHESTRATOR & CHAT EVALUATION 🚀")
    
    # IMPORTANT: Replace this with a real user ID from your database!
    VALID_USER_ID = "paste_your_real_user_id_here"
    
    # ---------------------------------------------------------
    # TEST 1: The Multi-Turn Conversation (Memory Test)
    # ---------------------------------------------------------
    print("\n\n🧪 TEST 1: THE MULTI-TURN BOOKING (Testing Memory & Concierge)")
    # We generate a random Thread ID so this conversation has a clean memory slate
    thread_1 = str(uuid.uuid4()) 
    
    # Turn 1: Give incomplete room requirements (multiple options available)
    await chat_turn(f"I need a room for 5 people tomorrow at 3 PM MYT for 1 hour. My user ID is '{VALID_USER_ID}'.", thread_1)
    
    # Turn 2: Reply to the AI's question. The AI MUST remember the time/duration from Turn 1!
    await chat_turn("I'll take Discussion Room 3, please.", thread_1)


    # ---------------------------------------------------------
    # TEST 2: The Blockage / Conflict Resolution
    # ---------------------------------------------------------
    print("\n\n🧪 TEST 2: THE BLOCKAGE (Testing Supervisor Conflict Resolution)")
    thread_2 = str(uuid.uuid4()) # Fresh memory for a new user/scenario
    
    # Ask for an absurd amount of equipment to trigger an internal failure
    await chat_turn(f"Book a room for tomorrow at 4 PM MYT. My user ID is '{VALID_USER_ID}'. Also, I need 100 portable projectors.", thread_2)


    # ---------------------------------------------------------
    # TEST 3: General Chat (Testing Synthesizer Bypass)
    # ---------------------------------------------------------
    print("\n\n🧪 TEST 3: GENERAL CHAT (Testing Direct-to-Synthesizer Routing)")
    thread_3 = str(uuid.uuid4()) # Fresh memory
    
    # Just make small talk. The Boss should NOT wake up the Booking Agent.
    await chat_turn("Hello! What kind of tasks can you help me with today?", thread_3)


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    asyncio.run(run_evaluation())