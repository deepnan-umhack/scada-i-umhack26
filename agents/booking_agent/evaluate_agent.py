import asyncio
from langchain_core.messages import HumanMessage
from booking_agent import booking_worker

async def run_evaluation():
    print("="*60)
    print("🛡️ STARTING AGENT EVALUATION GAUNTLET 🛡️")
    print("="*60 + "\n")

    # IMPORTANT: Fill in these variables before running!
    VALID_USER_ID = "scadai_user_001"
    # To test the race condition, pick a room and time you KNOW is already booked in your DB
    BOOKED_ROOM_ID = "b9969334-2b9b-4da4-853c-e89ef19be7e4" 
    BOOKED_TIME_UTC = "2026-04-20T14:00:00Z" 

    tests = {
        "Test 1: The Missing Data Test": 
            "Book a room for tomorrow.",
            
        "Test 2: The Timezone Trap": 
            f"I am in Tokyo. Book a meeting for 9 AM my time tomorrow. My user ID is '{VALID_USER_ID}'.",
            
        "Test 3: The Race Condition": 
            f"Book room {BOOKED_ROOM_ID} for {BOOKED_TIME_UTC} for 60 minutes. My user ID is '{VALID_USER_ID}'.",
            
        "Test 4: The Greedy User": 
            f"Book a room tomorrow at 2 PM UTC for 1 hour. My user ID is '{VALID_USER_ID}'. Book all the projectors you have for my meeting.",
            
        "Test 5: The Distraction": 
            f"Book a room for tomorrow at 3 PM UTC for 1 hour. My user ID is '{VALID_USER_ID}'. And also tell me a joke about a duck.",
            
        "Test 6: THE GOLDEN PATH": 
            f"I need a room for 5 people tomorrow at 3 PM MYT for 2 hours, and I need 1 projector and 2 whiteboards. My ID is '{VALID_USER_ID}'."
    }

    for test_name, prompt in tests.items():
        print(f"\n🧪 {test_name.upper()}")
        print(f"👤 USER: {prompt}")
        print("-" * 60)
        
        try:
            # We use ainvoke() instead of astream() here to just get the final answer.
            # We want to see how the agent responds to the user/orchestrator.
            response = await booking_worker.ainvoke(
                {"messages": [HumanMessage(content=prompt)]}
            )
            
            # Extract the final message content
            final_message = response["messages"][-1].content
            print(f"🤖 AGENT: {final_message}")
            
        except Exception as e:
            print(f"❌ SYSTEM ERROR: {str(e)}")
            
        print("="*60)

if __name__ == "__main__":
    # Suppress Langchain warnings for a clean test output
    import warnings
    warnings.filterwarnings("ignore")
    
    asyncio.run(run_evaluation())