import asyncio
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Union, Optional
from pydantic import BaseModel, Field

from langchain_core.tools import tool

# ------------------------------------------------------------------
# 1. Tool: Get Current Date Time UTC
# ------------------------------------------------------------------
# This tool doesn't strictly need an input schema, but LangChain/LangGraph 
# often prefer an empty schema for consistency in tool binding.
class GetCurrentDateTimeUTCInput(BaseModel):
    pass

@tool(args_schema=GetCurrentDateTimeUTCInput)
async def get_current_datetime_utc_tool() -> str:
    """
    Returns the current exact date and time in UTC. 
    The AI uses this to understand what "today" or "tomorrow" means.
    """
    now_utc = datetime.now(timezone.utc)
    
    return json.dumps({
        "status": "success",
        "current_datetime_utc": now_utc.isoformat(),
        "current_day_of_week": now_utc.strftime("%A") # Helps the AI with "Next Tuesday"
    })


# ------------------------------------------------------------------
# 2. Tool: Convert User Time to UTC
# ------------------------------------------------------------------
class ConvertUserTimeToUTCInput(BaseModel):
    local_time_string: str = Field(
        ..., 
        description="The local date and time in naive ISO 8601 format (e.g., '2026-04-20T15:00:00'). Do NOT include timezone offsets here."
    )
    user_timezone: str = Field(
        ..., 
        description="The IANA timezone database string of the user (e.g., 'America/New_York', 'Asia/Kuala_Lumpur', 'Europe/London')."
    )

@tool(args_schema=ConvertUserTimeToUTCInput)
async def convert_user_time_to_utc_tool(local_time_string: str, user_timezone: str) -> str:
    """
    Converts a user's local conversational time into the strict UTC format 
    required by the database and calendar APIs.
    """

    try:
        # 1. Parse the naive string (no timezone attached yet)
        local_dt = datetime.fromisoformat(local_time_string)
        
        # 2. Grab the specific timezone rules
        tz = ZoneInfo(user_timezone)
        
        # 3. Attach the timezone to the naive datetime
        local_dt_aware = local_dt.replace(tzinfo=tz)
        
        # 4. Convert safely to UTC
        utc_dt = local_dt_aware.astimezone(timezone.utc)
        
        return json.dumps({
            "status": "success",
            "original_local_time": local_dt_aware.isoformat(),
            "converted_utc_time": utc_dt.isoformat()
        })
        
    except ZoneInfoNotFoundError:
        return json.dumps({
            "status": "error",
            "message": f"Invalid timezone string '{user_timezone}'. Please provide a valid IANA timezone like 'Europe/London'."
        })
    except ValueError as e:
        return json.dumps({
            "status": "error",
            "message": f"Invalid time format. Ensure it is ISO 8601 (YYYY-MM-DDTHH:MM:SS). Details: {str(e)}"
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": f"Conversion error: {str(e)}"})


# ------------------------------------------------------------------
# 3. Local Testing
# ------------------------------------------------------------------
if __name__ == "__main__":
    async def run_tests():
        print("--- Testing Time Utility Tools ---")
        
        # Test 1: Get Current UTC Time
        print("\n[Test 1] Fetching current UTC time...")
        result1 = await get_current_datetime_utc_tool()
        print(json.dumps(json.loads(result1), indent=2))

        # Test 2: Convert Local Time to UTC
        # Simulating a user in Malaysia asking for a 3:00 PM meeting
        test_payload_2 = {
            "local_time_string": "2026-04-20T15:00:00",
            "user_timezone": "Asia/Kuala_Lumpur"
        }

        print(f"\n[Test 2] Converting {test_payload_2['local_time_string']} ({test_payload_2['user_timezone']}) to UTC...")
        result2 = await convert_user_time_to_utc_tool(**test_payload_2)
        print(json.dumps(json.loads(result2), indent=2))
        
        # Test 3: Catching LLM formatting mistakes (e.g., using "EST" instead of "America/New_York")
        test_payload_3 = {
            "local_time_string": "2026-04-20T15:00:00",
            "user_timezone": "EST" # This should purposefully fail and instruct the AI
        }
        
        print(f"\n[Test 3] Testing timezone error handling...")
        result3 = await convert_user_time_to_utc_tool(**test_payload_3)
        print(json.dumps(json.loads(result3), indent=2))

    # Run the async test loop
    asyncio.run(run_tests())