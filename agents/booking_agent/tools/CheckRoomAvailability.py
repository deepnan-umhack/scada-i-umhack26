import asyncio
import asyncpg
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union
from dotenv import load_dotenv

from pydantic import BaseModel, Field, field_validator
from langchain_core.tools import tool

# Load env
load_dotenv()
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Pydantic Schemas (V2 Compliant)
# ------------------------------------------------------------------
class CheckRoomAvailabilityInput(BaseModel):
    start_time_utc: Union[datetime, str] = Field(
        ...,
        description="Exact start time in strict ISO 8601 UTC (e.g. '2026-04-20T14:00:00Z').",
    )
    duration_minutes: int = Field(..., description="Duration in minutes.")
    min_capacity: int = Field(1, description="Minimum room capacity. Defaults to 1.")
    required_features: Optional[List[str]] = Field(
        None, description="Optional list of required features (e.g., ['projector'])."
    )
    exclude_booking_id: Optional[str] = Field(
        None, 
        description="CRITICAL FOR UPDATES: If the user wants to update or delay an existing booking, provide the current booking ID here so the database ignores its original time slot during the availability check."
    )
    limit: int = Field(
        5,
        description="Number of room options to return. Default is 5. Maximum is 10."
    )

    @field_validator("start_time_utc", mode="before")
    @classmethod
    def parse_start_time(cls, v):
        if isinstance(v, datetime):
            dt = v
        else:
            if isinstance(v, str) and v.endswith("Z"):
                v = v.replace("Z", "+00:00")
            dt = datetime.fromisoformat(v)
        if dt.tzinfo is None or dt.utcoffset() != timedelta(0):
            raise ValueError("start_time_utc must be an explicit UTC datetime")
        return dt


class RoomInfo(BaseModel):
    id: str
    name: str
    capacity: Optional[int] = None
    features: Optional[List[str]] = None


class AvailabilityResult(BaseModel):
    status: str
    available_rooms: List[RoomInfo] = []
    message: Optional[str] = None


# ------------------------------------------------------------------
# 2. Database Query
# ------------------------------------------------------------------
async def _query_available_rooms(
    min_capacity: int, 
    start_time: datetime, 
    end_time: datetime, 
    exclude_booking_id: Optional[str], 
    limit: int
) -> List[dict]:
    """Return list of room dicts from DB matching capacity and not booked."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # 🚀 FIX 1: THE LAZY JANITOR
        # Automatically clean up old bookings in the database before querying
        await conn.execute("""
            UPDATE bookings 
            SET status = 'COMPLETED' 
            WHERE end_time < CURRENT_TIMESTAMP AND status = 'CONFIRMED';
        """)

        # 🚀 FIX 2: THE SMART SQL OVERLAP (Now with Self-Conflict prevention!)
        # Target ONLY 'CONFIRMED' bookings, check for time overlap, and ignore the excluded ID
        query = """
            SELECT r.id, r.name, r.capacity, r.features
            FROM rooms r
            WHERE r.capacity >= $1
              AND r.id NOT IN (
                  SELECT b.room_id FROM bookings b
                  WHERE b.status = 'CONFIRMED' 
                    AND b.start_time < $3 
                    AND b.end_time > $2
                    AND ($4::uuid IS NULL OR b.id != $4::uuid)
              )
            ORDER BY r.capacity ASC
            LIMIT $5
        """
        # Pass the exclude_booking_id as the 4th parameter, and limit as the 5th
        rows = await conn.fetch(query, min_capacity, start_time, end_time, exclude_booking_id, limit)
        results = []
        for r in rows:
            features = r.get("features")
            if isinstance(features, str):
                try:
                    features = json.loads(features)
                except Exception:
                    features = None
            results.append({
                "id": str(r["id"]),
                "name": r["name"],
                "capacity": r.get("capacity"),
                "features": features,
            })
        return results
    finally:
        await conn.close()


# ------------------------------------------------------------------
# 3. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=CheckRoomAvailabilityInput)
async def check_room_availability_tool(
    start_time_utc: Union[datetime, str],
    duration_minutes: int,
    min_capacity: int = 1,
    required_features: Optional[List[str]] = None,
    exclude_booking_id: Optional[str] = None,
    limit: int = 5
) -> str:
    """
    Main Async Tool. Checks room availability for a given time slot.
    Pass this directly to your async LangGraph node.
    """
    if isinstance(start_time_utc, str):
        if start_time_utc.endswith("Z"):
            start_time_utc = start_time_utc.replace("Z", "+00:00")
        start_time: datetime = datetime.fromisoformat(start_time_utc)
    else:
        start_time: datetime = start_time_utc
    
    end_time = start_time + timedelta(minutes=duration_minutes)

    rooms = []
    safe_limit = min(limit, 10)
    
    if DATABASE_URL:
        try:
            # Pass the new parameter into the query function
            rooms = await _query_available_rooms(
                min_capacity, start_time, end_time, exclude_booking_id, safe_limit
            )
        except Exception as e:
            return AvailabilityResult(
                status="error", 
                available_rooms=[], 
                message=f"DB error: {e}"
            ).model_dump_json()
    else:
        # Fallback dummy data if no DB is connected
        rooms = [
            {"id": "101", "name": "Boardroom A", "capacity": 10, "features": ["projector"]},
            {"id": "102", "name": "The Fishbowl", "capacity": 4, "features": ["whiteboard"]},
        ]

    if required_features:
        filtered = []
        required = set(required_features)
        for r in rooms:
            feats = r.get("features") or []
            if required.issubset(set(feats)):
                filtered.append(r)
        rooms = filtered

    if not rooms:
        return AvailabilityResult(
            status="no_rooms_found", 
            available_rooms=[], 
            message="No rooms available for this time and capacity."
        ).model_dump_json()

    room_objs = [RoomInfo(**r) for r in rooms]
    return AvailabilityResult(status="success", available_rooms=room_objs).model_dump_json()

if __name__ == "__main__":
    async def main():
        now = datetime.now(timezone.utc)
        sample = {
            "start_time_utc": (now + timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
            "min_capacity": 2,
            "required_features": None,
            "exclude_booking_id": None # Test passing None
        }
        
        # Test it natively using .invoke() which LangChain V0.2+ prefers
        result = await check_room_availability_tool.ainvoke(sample)
        print(result)
        
    asyncio.run(main())