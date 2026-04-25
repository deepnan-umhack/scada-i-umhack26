import asyncio
import asyncpg
import os
import json
from datetime import datetime, timezone
from typing import Optional, Union, List
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field, field_validator
from langchain_core.tools import tool

# Load env variables safely
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Pydantic Schemas
# ------------------------------------------------------------------
class GetUserBookingsInput(BaseModel):
    user_id: str = Field(..., description="The ID of the user whose bookings we are retrieving.")
    
    # Optional date filters so the LLM can query specific days (e.g., "tomorrow")
    start_date_utc: Optional[Union[datetime, str]] = Field(
        None, description="Optional start bound for the search in strict ISO 8601 UTC."
    )
    end_date_utc: Optional[Union[datetime, str]] = Field(
        None, description="Optional end bound for the search in strict ISO 8601 UTC."
    )
    
    limit: int = Field(10, description="Max number of bookings to return to protect context window.")

    @field_validator("start_date_utc", "end_date_utc", mode="before")
    @classmethod
    def parse_time(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            if v.endswith("Z"): v = v.replace("Z", "+00:00")
            v = datetime.fromisoformat(v)
        if v.tzinfo is None:
            raise ValueError("Must be timezone-aware UTC datetime")
        return v

# ------------------------------------------------------------------
# 2. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=GetUserBookingsInput)
async def get_user_bookings_tool(
    user_id: str,
    start_date_utc: Optional[Union[datetime, str]] = None,
    end_date_utc: Optional[Union[datetime, str]] = None,
    limit: int = 10
) -> str:
    """
    Retrieves a user's active/upcoming bookings, including the human-readable room name.
    """
    # Parse datetime strings if provided
    if isinstance(start_date_utc, str):
        if start_date_utc.endswith("Z"):
            start_date_utc = start_date_utc.replace("Z", "+00:00")
        start_date_utc = datetime.fromisoformat(start_date_utc)
    
    if isinstance(end_date_utc, str):
        if end_date_utc.endswith("Z"):
            end_date_utc = end_date_utc.replace("Z", "+00:00")
        end_date_utc = datetime.fromisoformat(end_date_utc)
    
    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Base query joining bookings with rooms to get the actual room name
        query = """
            SELECT 
                b.id as booking_id, 
                b.start_time, 
                b.end_time, 
                b.purpose, 
                b.status,
                b.target_department_ids,
                r.id as room_id, 
                r.name as room_name
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.user_id = $1 AND b.status != 'CANCELLED'
        """
        
        # Dynamic argument binding for asyncpg
        args = [user_id]
        param_idx = 2

        # 1. Apply Start Date Filter (or default to NOW to hide past meetings)
        if start_date_utc:
            query += f" AND b.start_time >= ${param_idx}"
            args.append(start_date_utc)
            param_idx += 1
        else:
            # Default behavior: Only show meetings that haven't ended yet
            query += f" AND b.end_time >= ${param_idx}"
            args.append(datetime.now(timezone.utc))
            param_idx += 1

        # 2. Apply End Date Filter
        if end_date_utc:
            query += f" AND b.start_time <= ${param_idx}"
            args.append(end_date_utc)
            param_idx += 1

        # 3. Apply Ordering and Limit
        query += f" ORDER BY b.start_time ASC LIMIT ${param_idx}"
        safe_limit = min(limit, 20) # Hard cap at 20
        args.append(safe_limit)

        # Execute Query
        rows = await conn.fetch(query, *args)
        
        if not rows:
            return json.dumps({
                "status": "success",
                "bookings": [],
                "message": "No active bookings found for this user in the specified time range."
            })

        # Format rows into a clean dictionary list for the LLM
        formatted_bookings = []
        for r in rows:
            formatted_bookings.append({
                "booking_id": str(r["booking_id"]),
                "room_id": str(r["room_id"]),
                "room_name": r["room_name"],
                "start_time_utc": r["start_time"].isoformat(),
                "end_time_utc": r["end_time"].isoformat(),
                "purpose": r["purpose"] or "No purpose provided",
                "target_department_ids": [str(department_id) for department_id in (r["target_department_ids"] or [])]
            })

        return json.dumps({
            "status": "success",
            "bookings": formatted_bookings
        })

    except Exception as e:
        return json.dumps({"status": "error", "message": f"Database error: {str(e)}"})
        
    finally:
        await conn.close()

# ------------------------------------------------------------------
# 3. Local Testing
# ------------------------------------------------------------------
if __name__ == "__main__":
    async def run_tests():
        print("--- Testing Get User Bookings Tool ---")
        
        # IMPORTANT: Put the user_id that you successfully booked a room for in the previous test!
        test_payload = {
            "user_id": "scadai_user_001", 
            "limit": 5
        }

        print(f"\nRetrieving upcoming bookings for user '{test_payload['user_id']}'...")
        result = await get_user_bookings_tool(**test_payload)
        
        # Print pretty JSON for easier reading in the terminal
        try:
            parsed = json.loads(result)
            print(json.dumps(parsed, indent=2))
        except:
            print("Response:", result)

    # Run the async test loop
    asyncio.run(run_tests())