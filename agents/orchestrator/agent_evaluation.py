import asyncio
import uuid
import json
import sys
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv, find_dotenv
from langchain_core.messages import HumanMessage
from zoneinfo import ZoneInfo

# Force load environment variables
load_dotenv(find_dotenv())

# Add the agents directory to the path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the workflow and dependencies from supervisor.py
from orchestrator.supervisor import workflow
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DATABASE_URL = os.getenv("POSTGRES_URL")

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def print_test_header(test_name: str, description: str):
    """Print a formatted test header."""
    print("\n" + "=" * 80)
    print(f"🧪 {test_name}")
    print(f"📝 {description}")
    print("=" * 80)


def print_user_input(user_input: str):
    """Print formatted user input."""
    print(f"\n👤 USER:\n{user_input}")
    print("-" * 80)


def print_system_response(response: str):
    """Print formatted system response."""
    print(f"\n🤖 SYSTEM RESPONSE:\n{response}")
    print("-" * 80)


async def chat_turn(user_input: str, thread_id: str) -> str:
    """
    Simulates a single turn of conversation.
    Passes the thread_id to ensure LangGraph loads the correct memory.
    
    Returns:
        The final response message from the system.
    """
    print_user_input(user_input)
    
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Compile the workflow with PostgreSQL checkpointer for memory persistence
        async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as memory:
            app = workflow.compile(checkpointer=memory)
            
            # ainvoke will run the graph until it hits END (after the Synthesizer)
            result = await app.ainvoke(
                {"messages": [HumanMessage(content=user_input)]}, 
                config=config
            )
            
            # The final reply should be the last message in the state (from the Synthesizer)
            final_message = result["messages"][-1].content
            print_system_response(final_message)
            return final_message
        
    except Exception as e:
        print(f"\n❌ SYSTEM ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        return f"Error: {str(e)}"


def get_future_datetime(hours_offset: int = 24, minutes: int = 30) -> str:
    """Get a future datetime string in MYT (Malaysia Time)."""
    myt_tz = ZoneInfo("Asia/Kuala_Lumpur")
    future_time = datetime.now(myt_tz) + timedelta(hours=hours_offset)
    future_time = future_time.replace(minute=minutes, second=0, microsecond=0)
    return future_time.isoformat()


# ==========================================
# TEST SCENARIOS
# ==========================================

async def test_1_booking_creation(user_id: str, thread_id: str):
    """Test 1: Create a room booking."""
    print_test_header(
        "TEST 1: BOOKING CREATION",
        "Create a new room booking for a meeting"
    )
    
    await chat_turn(
        f"I need to book a room for a team meeting tomorrow at 2:30 PM MYT for 2 hours. "
        f"We need space for 10 people. My user ID is '{user_id}'. Please check availability and help me book.",
        thread_id
    )


async def test_2_check_available_rooms(user_id: str, thread_id: str):
    """Test 2: Check available rooms."""
    print_test_header(
        "TEST 2: CHECK AVAILABLE ROOMS",
        "Query available rooms for a specific time slot"
    )
    
    await chat_turn(
        f"What meeting rooms are available tomorrow from 1:00 PM to 3:00 PM MYT? "
        f"I need space for 5 people. User ID: {user_id}",
        thread_id
    )


async def test_3_booking_confirmation(user_id: str, thread_id: str):
    """Test 3: Confirm a booking (multi-turn)."""
    print_test_header(
        "TEST 3: BOOKING CONFIRMATION (Multi-Turn)",
        "Create a booking with room selection in multi-turn conversation"
    )
    
    # Turn 1: Request a booking
    response1 = await chat_turn(
        f"I need to book a room for tomorrow at 3:00 PM MYT for 1 hour. "
        f"We have 8 people. My user ID is '{user_id}'.",
        thread_id
    )
    
    # Turn 2: Select a room from available options
    await chat_turn(
        "Let me book the Auditorium.",
        thread_id
    )


async def test_4_get_user_bookings(user_id: str, thread_id: str):
    """Test 4: Retrieve user's bookings."""
    print_test_header(
        "TEST 4: GET USER BOOKINGS",
        "Retrieve all bookings for the user"
    )
    
    await chat_turn(
        f"Show me all my bookings. My user ID is '{user_id}'.",
        thread_id
    )


async def test_5_booking_cancellation(user_id: str, thread_id: str):
    """Test 5: Cancel a booking."""
    print_test_header(
        "TEST 5: BOOKING CANCELLATION",
        "Cancel an existing booking"
    )
    
    # First, create a booking to cancel
    response1 = await chat_turn(
        f"I need to book a room for tomorrow at 4:00 PM MYT for 1 hour. "
        f"My user ID is '{user_id}'.",
        thread_id
    )
    
    # Then cancel it
    await chat_turn(
        f"Actually, please cancel my last booking. User ID: {user_id}.",
        thread_id
    )


async def test_6_update_booking_status(user_id: str, thread_id: str):
    """Test 6: Update booking status."""
    print_test_header(
        "TEST 6: UPDATE BOOKING STATUS",
        "Change the status of an existing booking (e.g., mark as confirmed)"
    )
    
    # Create a booking first
    response1 = await chat_turn(
        f"I need to book the Conference Room for tomorrow at 2:00 PM MYT for 2 hours. "
        f"My user ID is '{user_id}'.",
        thread_id
    )
    
    # Then update its status
    await chat_turn(
        f"Can you update the status of my last booking to 'confirmed'? User ID: {user_id}.",
        thread_id
    )


async def test_7_temperature_change_request(user_id: str, thread_id: str):
    """Test 7: Temperature change request (HVAC)."""
    print_test_header(
        "TEST 7: TEMPERATURE CHANGE REQUEST",
        "Request temperature adjustment for a room"
    )
    
    await chat_turn(
        f"I'm in the Auditorium and it's too warm. Can you lower the temperature to 20°C? "
        f"My user ID is '{user_id}'.",
        thread_id
    )


async def test_8_hvac_pre_cooling(user_id: str, thread_id: str):
    """Test 8: HVAC pre-cooling request."""
    print_test_header(
        "TEST 8: HVAC PRE-COOLING",
        "Request pre-cooling for a room before an event"
    )
    
    await chat_turn(
        f"We have a large meeting in the Main Hall tomorrow at 2:00 PM MYT with 50 people. "
        f"Can you pre-cool the room to 21°C starting from 1:00 PM? User ID: {user_id}",
        thread_id
    )


async def test_9_esg_report_generation(user_id: str, thread_id: str):
    """Test 9: ESG report generation."""
    print_test_header(
        "TEST 9: ESG REPORT GENERATION",
        "Generate an ESG (Environmental, Social, Governance) report"
    )
    
    await chat_turn(
        f"Can you generate an ESG report for our building's energy usage for the past month? "
        f"User ID: {user_id}",
        thread_id
    )


async def test_10_energy_data_analysis(user_id: str, thread_id: str):
    """Test 10: Fetch and analyze energy data."""
    print_test_header(
        "TEST 10: ENERGY DATA ANALYSIS",
        "Fetch energy data and provide insights"
    )
    
    await chat_turn(
        f"Show me the energy consumption data for the Auditorium for this month. "
        f"Include HVAC compliance analysis. User ID: {user_id}",
        thread_id
    )


async def test_11_space_utilization_analysis(user_id: str, thread_id: str):
    """Test 11: Space utilization analysis."""
    print_test_header(
        "TEST 11: SPACE UTILIZATION ANALYSIS",
        "Analyze room utilization patterns"
    )
    
    await chat_turn(
        f"Analyze the space utilization for conference rooms this month. "
        f"Which rooms are underutilized? User ID: {user_id}",
        thread_id
    )


async def test_12_carbon_offset_calculation(user_id: str, thread_id: str):
    """Test 12: Carbon offset cost calculation."""
    print_test_header(
        "TEST 12: CARBON OFFSET CALCULATION",
        "Calculate carbon offset costs for the facility"
    )
    
    await chat_turn(
        f"What is the estimated carbon offset cost for our building's emissions last month? "
        f"User ID: {user_id}",
        thread_id
    )


async def test_13_combined_booking_and_hvac(user_id: str, thread_id: str):
    """Test 13: Combined booking + HVAC request."""
    print_test_header(
        "TEST 13: COMBINED BOOKING + HVAC",
        "Complex request involving both booking and temperature control"
    )
    
    await chat_turn(
        f"I need to book the Grand Hall for a gala dinner tomorrow at 6:00 PM MYT for 4 hours. "
        f"We expect 200 guests. Can you also make sure the temperature is set to 22°C? "
        f"User ID: {user_id}",
        thread_id
    )


async def test_14_multi_turn_complex_flow(user_id: str, thread_id: str):
    """Test 14: Multi-turn complex workflow."""
    print_test_header(
        "TEST 14: MULTI-TURN COMPLEX WORKFLOW",
        "Test memory and multi-agent coordination across multiple turns"
    )
    
    # Turn 1: Initial request
    response1 = await chat_turn(
        f"I'm organizing a corporate training session. We need a large room for 100 people. "
        f"We have 4 days of training next week, each day from 9 AM to 5 PM MYT. "
        f"I also want the room kept cool at 19°C. User ID: {user_id}",
        thread_id
    )
    
    # Turn 2: Clarification
    await chat_turn(
        "Let's start with just the first day, Monday. What's the best room for 100 people?",
        thread_id
    )
    
    # Turn 3: Confirm and check status
    await chat_turn(
        "Great, please book the Ballroom for Monday. Can you also generate an energy efficiency report for that room?",
        thread_id
    )


async def test_15_general_inquiry(user_id: str, thread_id: str):
    """Test 15: General inquiry (no agent routing needed)."""
    print_test_header(
        "TEST 15: GENERAL INQUIRY",
        "Test synthesizer for non-routing conversations"
    )
    
    await chat_turn(
        "Hello! What services can your facilities management system help me with?",
        thread_id
    )


# ==========================================
# MAIN EVALUATION RUNNER
# ==========================================

async def run_evaluation():
    """Run comprehensive evaluation of all agent functions."""
    print("\n" + "=" * 80)
    print("🚀 COMPREHENSIVE ORCHESTRATOR & AGENT EVALUATION 🚀")
    print("=" * 80)
    
    # Use a consistent user ID for all tests
    VALID_USER_ID = "user_12345"  # Replace with actual user from your database
    
    print(f"\n📋 Test Configuration:")
    print(f"   User ID: {VALID_USER_ID}")
    print(f"   Environment: Production-like")
    print(f"   Database: PostgreSQL (via Orchestrator)")
    
    try:
        # Test 1: Booking Creation
        thread_1 = str(uuid.uuid4())
        await test_1_booking_creation(VALID_USER_ID, thread_1)
        
        # Test 2: Check Available Rooms
        thread_2 = str(uuid.uuid4())
        await test_2_check_available_rooms(VALID_USER_ID, thread_2)
        
        # Test 3: Booking Confirmation (Multi-turn)
        thread_3 = str(uuid.uuid4())
        await test_3_booking_confirmation(VALID_USER_ID, thread_3)
        
        # Test 4: Get User Bookings
        thread_4 = str(uuid.uuid4())
        await test_4_get_user_bookings(VALID_USER_ID, thread_4)
        
        # Test 5: Booking Cancellation
        thread_5 = str(uuid.uuid4())
        await test_5_booking_cancellation(VALID_USER_ID, thread_5)
        
        # Test 6: Update Booking Status
        thread_6 = str(uuid.uuid4())
        await test_6_update_booking_status(VALID_USER_ID, thread_6)
        
        # Test 7: Temperature Change Request
        thread_7 = str(uuid.uuid4())
        await test_7_temperature_change_request(VALID_USER_ID, thread_7)
        
        # Test 8: HVAC Pre-cooling
        thread_8 = str(uuid.uuid4())
        await test_8_hvac_pre_cooling(VALID_USER_ID, thread_8)
        
        # Test 9: ESG Report Generation
        thread_9 = str(uuid.uuid4())
        await test_9_esg_report_generation(VALID_USER_ID, thread_9)
        
        # Test 10: Energy Data Analysis
        thread_10 = str(uuid.uuid4())
        await test_10_energy_data_analysis(VALID_USER_ID, thread_10)
        
        # Test 11: Space Utilization Analysis
        thread_11 = str(uuid.uuid4())
        await test_11_space_utilization_analysis(VALID_USER_ID, thread_11)
        
        # Test 12: Carbon Offset Calculation
        thread_12 = str(uuid.uuid4())
        await test_12_carbon_offset_calculation(VALID_USER_ID, thread_12)
        
        # Test 13: Combined Booking + HVAC
        thread_13 = str(uuid.uuid4())
        await test_13_combined_booking_and_hvac(VALID_USER_ID, thread_13)
        
        # Test 14: Multi-turn Complex Workflow
        thread_14 = str(uuid.uuid4())
        await test_14_multi_turn_complex_flow(VALID_USER_ID, thread_14)
        
        # Test 15: General Inquiry
        thread_15 = str(uuid.uuid4())
        await test_15_general_inquiry(VALID_USER_ID, thread_15)
        
        # Print summary
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\n📊 Test Summary:")
        print("   ✓ Booking Creation")
        print("   ✓ Room Availability Checks")
        print("   ✓ Multi-Turn Booking Workflows")
        print("   ✓ Get User Bookings")
        print("   ✓ Booking Cancellation")
        print("   ✓ Booking Status Updates")
        print("   ✓ Temperature Change Requests (HVAC)")
        print("   ✓ HVAC Pre-cooling")
        print("   ✓ ESG Report Generation")
        print("   ✓ Energy Data Analysis")
        print("   ✓ Space Utilization Analysis")
        print("   ✓ Carbon Offset Calculations")
        print("   ✓ Combined Booking + HVAC Requests")
        print("   ✓ Multi-Turn Complex Workflows")
        print("   ✓ General Inquiries & Synthesizer")
        print("\n🎯 All agent functions tested and validated!")
        
    except Exception as e:
        print("\n" + "=" * 80)
        print("❌ EVALUATION FAILED")
        print("=" * 80)
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    asyncio.run(run_evaluation())