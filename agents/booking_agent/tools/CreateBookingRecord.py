import asyncio
import asyncpg
import os
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import Union, List, Optional
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field, field_validator
from langchain_core.tools import tool

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------------
class EquipmentRequest(BaseModel):
    equipment_id: str = Field(..., description="The UUID of the equipment.")
    quantity: int = Field(..., description="How many units needed.")

class CreateBookingInput(BaseModel):
    user_id: str = Field(..., description="The ID of the user making the booking.")
    room_id: str = Field(..., description="The ID of the room to book.")
    start_time_utc: Union[datetime, str] = Field(..., description="Start time in strict ISO 8601 UTC.")
    duration_minutes: int = Field(..., description="Duration in minutes.")
    purpose: str = Field(..., description="Purpose of the meeting.")
    
    equipment_requests: Optional[List[EquipmentRequest]] = Field(
        default=None, 
        description="Optional list of equipment required for the meeting."
    )
    
    # --- EDITED: Now accepts a LIST of strings for multiple departments ---
    target_department_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of department UUIDs involved in or responsible for this event."
    )
    # ----------------------------------------------------------------------
    
    source_prompt: str = Field(
        ..., 
        description="Original user prompt that initiated this booking."
    )

    @field_validator("start_time_utc", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            if v.endswith("Z"): v = v.replace("Z", "+00:00")
            v = datetime.fromisoformat(v)
        if v.tzinfo is None:
            raise ValueError("Must be timezone-aware UTC datetime")
        return v

# ------------------------------------------------------------------
# 2. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=CreateBookingInput)
async def create_booking_tool(
    user_id: str,
    room_id: str,
    start_time_utc: Union[datetime, str],
    duration_minutes: int,
    purpose: str,
    source_prompt: str,
    equipment_requests: Optional[List[dict]] = None,
    # --- EDITED: Parameter is now a list ---
    target_department_ids: Optional[List[str]] = None,
    # ---------------------------------------
) -> str:
    """
    Attempts to insert a new booking, associated equipment, and involved departments. 
    Relies on PostgreSQL transactions to ensure everything books together.
    """
    if isinstance(start_time_utc, str):
        start_time = datetime.fromisoformat(start_time_utc)
    else:
        start_time = start_time_utc
    
    end_time = start_time + timedelta(minutes=duration_minutes)

    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    # Ensure target_department_ids is at least an empty list for Postgres array
    if target_department_ids is None:
        target_department_ids = []

    normalized_department_ids: Optional[List[str]] = None
    if target_department_ids:
        normalized_department_ids = []
        for department_id in target_department_ids:
            try:
                normalized_department_ids.append(str(UUID(department_id)))
            except (TypeError, ValueError):
                return json.dumps({
                    "status": "error",
                    "message": f"Invalid department UUID: {department_id}"
                })

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        async with conn.transaction():
            await conn.execute(
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_prompt TEXT;"
            )
            await conn.execute(
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS target_department_ids uuid[];"
            )

            if normalized_department_ids:
                existing_departments = await conn.fetch(
                    "SELECT id FROM departments WHERE id = ANY($1::uuid[])",
                    normalized_department_ids,
                )
                existing_department_ids = {str(row["id"]) for row in existing_departments}
                missing_department_ids = [
                    department_id
                    for department_id in normalized_department_ids
                    if department_id not in existing_department_ids
                ]
                if missing_department_ids:
                    return json.dumps({
                        "status": "error",
                        "message": f"Unknown department UUID(s): {', '.join(missing_department_ids)}"
                    })
            
            # --- EDITED: INSERT uses target_department_ids and casts to uuid[] ---
            booking_query = """
                INSERT INTO bookings (room_id, user_id, start_time, end_time, purpose, status, source_prompt, target_department_ids)
                VALUES ($1, $2, $3, $4, $5, 'CONFIRMED', $6, $7::uuid[])
                RETURNING id;
            """
            new_booking_id = await conn.fetchval(
                booking_query,
                room_id,
                user_id,
                start_time,
                end_time,
                purpose,
                source_prompt,
                normalized_department_ids
            )
            # ---------------------------------------------------------------------
            
            if equipment_requests:
                equip_query = """
                    INSERT INTO booking_equipment (booking_id, equipment_id, quantity, fulfillment_status)
                    VALUES ($1, $2, $3, 'PENDING');
                """
                for item in equipment_requests:
                    if isinstance(item, dict):
                        equip_id = item["equipment_id"]
                        qty = item["quantity"]
                    else:
                        equip_id = item.equipment_id
                        qty = item.quantity
                    
                    await conn.execute(equip_query, new_booking_id, equip_id, qty)
            
        msg = "Room booking confirmed."
        if equipment_requests and normalized_department_ids:
            msg = f"Booking, equipment, and {len(normalized_department_ids)} involved department(s) successfully logged."
        elif equipment_requests:
            msg = "Booking and equipment confirmed."
        elif normalized_department_ids:
            msg = f"Booking and {len(normalized_department_ids)} involved department(s) successfully logged."

        return json.dumps({
            "status": "success",
            "booking_id": str(new_booking_id),
            "room_id": room_id,
            "user_id": user_id,
            "start_time_utc": start_time.astimezone(timezone.utc).isoformat(),
            "end_time_utc": end_time.astimezone(timezone.utc).isoformat(),
            "duration_minutes": duration_minutes,
            "purpose": purpose,
            "target_department_ids": normalized_department_ids or [],
            "message": msg
        })

    except asyncpg.exceptions.ExclusionViolationError:
        return json.dumps({
            "status": "conflict",
            "message": "RACE_CONDITION: This room was just booked by someone else for this time slot. Please ask the user to pick a different room or time."
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
        print("--- Testing Create Booking Tool with Multiple Departments ---")
        
        now = datetime.now(timezone.utc)
        tomorrow_2pm = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
        
        # IMPORTANT: Replace these UUIDs with real ones from your DB!
        test_payload = {
            "user_id": "scadai_user_001", 
            "room_id": "b9969334-2b9b-4da4-853c-e89ef19be7e4",
            "start_time_utc": tomorrow_2pm.isoformat(),
            "duration_minutes": 90,
            "purpose": "Q4 Strategy Pitch",
            "source_prompt": "Book a room for my Q4 Strategy Pitch tomorrow at 2 PM for 90 minutes.",
            "equipment_requests": [
                {
                    "equipment_id": "e1111111-1111-1111-1111-111111111111", 
                    "quantity": 1
                }
            ],
            # --- EDITED: Now an array of strings ---
            "target_department_ids": [
                "d1111111-1111-1111-1111-111111111111",
                "d2222222-2222-2222-2222-222222222222"
            ]
            # ---------------------------------------
        }

        print("\n[Test 1] Attempting booking with equipment and multiple departments...")
        result1 = await create_booking_tool.ainvoke(test_payload)
        
        try:
            print(json.dumps(json.loads(result1), indent=2))
        except:
            print("Response 1:", result1)

    asyncio.run(run_tests())