import asyncio
import asyncpg
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Union
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field, field_validator, model_validator
from langchain_core.tools import tool

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")


class UpdateBookingDetailsInput(BaseModel):
    booking_id: str = Field(..., description="The UUID of the booking to update.")
    room_id: Optional[str] = Field(None, description="New room UUID if the room should change.")
    start_time_utc: Optional[Union[datetime, str]] = Field(
        None,
        description="New start time in strict ISO 8601 UTC if the booking should be rescheduled.",
    )
    duration_minutes: Optional[int] = Field(
        None,
        description="New duration in minutes if the booking duration should change.",
    )
    purpose: Optional[str] = Field(
        None,
        description="New purpose text if the booking purpose should change.",
    )

    @field_validator("start_time_utc", mode="before")
    @classmethod
    def parse_time(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            if v.endswith("Z"):
                v = v.replace("Z", "+00:00")
            v = datetime.fromisoformat(v)
        if v.tzinfo is None:
            raise ValueError("Must be timezone-aware UTC datetime")
        return v

    @model_validator(mode="after")
    def require_at_least_one_change(self):
        if not any([self.room_id, self.start_time_utc, self.duration_minutes, self.purpose]):
            raise ValueError("At least one booking field must be provided to update.")
        return self


@tool(args_schema=UpdateBookingDetailsInput)
async def update_booking_details_tool(
    booking_id: str,
    room_id: Optional[str] = None,
    start_time_utc: Optional[Union[datetime, str]] = None,
    duration_minutes: Optional[int] = None,
    purpose: Optional[str] = None,
) -> str:
    """Updates booking fields such as room, time, duration, or purpose."""
    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    if isinstance(start_time_utc, str):
        if start_time_utc.endswith("Z"):
            start_time_utc = start_time_utc.replace("Z", "+00:00")
        start_time_utc = datetime.fromisoformat(start_time_utc)

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        current = await conn.fetchrow(
            """
            SELECT id, room_id, start_time, end_time, purpose, status
            FROM bookings
            WHERE id = $1
            """,
            booking_id,
        )

        if not current:
            return json.dumps({"status": "not_found", "message": f"No booking found with ID {booking_id}."})

        if current["status"] != "CONFIRMED":
            return json.dumps({
                "status": "error",
                "message": f"Only CONFIRMED bookings can be updated. Current status is {current['status']}."
            })

        final_room_id = room_id or str(current["room_id"])
        final_start_time = start_time_utc or current["start_time"]
        final_duration_minutes = duration_minutes or int((current["end_time"] - current["start_time"]).total_seconds() // 60)
        final_end_time = final_start_time + timedelta(minutes=final_duration_minutes)
        final_purpose = purpose if purpose is not None else current["purpose"]

        conflict = await conn.fetchrow(
            """
            SELECT id
            FROM bookings
            WHERE room_id = $1
              AND status = 'CONFIRMED'
              AND id != $4
              AND start_time < $3
              AND end_time > $2
            LIMIT 1
            """,
            final_room_id,
            final_start_time,
            final_end_time,
            booking_id,
        )

        if conflict:
            return json.dumps({
                "status": "conflict",
                "message": "This new time/room overlaps with an existing confirmed booking."
            })

        await conn.execute(
            """
            UPDATE bookings
            SET room_id = $1,
                start_time = $2,
                end_time = $3,
                purpose = $4
            WHERE id = $5
            """,
            final_room_id,
            final_start_time,
            final_end_time,
            final_purpose,
            booking_id,
        )

        return json.dumps({
            "status": "success",
            "message": "Booking details updated successfully.",
            "booking_id": booking_id,
            "room_id": final_room_id,
            "start_time_utc": final_start_time.isoformat(),
            "end_time_utc": final_end_time.isoformat(),
        })

    except Exception as e:
        return json.dumps({"status": "error", "message": f"Database error: {str(e)}"})
    finally:
        await conn.close()


if __name__ == "__main__":
    async def run_tests():
        print("--- Testing Update Booking Details Tool ---")
        test_payload = {
            "booking_id": "6ee53cd9-4e96-4ab0-b057-e527be7849f8",
            "start_time_utc": "2026-04-24T15:00:00+00:00",
            "duration_minutes": 90,
        }
        result = await update_booking_details_tool(**test_payload)
        print("Response:", result)

    asyncio.run(run_tests())