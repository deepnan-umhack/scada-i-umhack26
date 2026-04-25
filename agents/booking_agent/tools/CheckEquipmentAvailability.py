import asyncio
import asyncpg
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Union, List, Optional
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field, field_validator
from langchain_core.tools import tool

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

class CheckEquipmentAvailabilityInput(BaseModel):
    start_time_utc: Union[datetime, str] = Field(..., description="Start time in strict ISO 8601 UTC.")
    duration_minutes: int = Field(..., description="Duration of the meeting in minutes.")
    requested_items: Optional[List[str]] = Field(
        default=None, 
        description="Optional list of keywords to search for (e.g., ['projector', 'mic']). If empty, returns all equipment."
    )

    @field_validator("start_time_utc", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            if v.endswith("Z"): v = v.replace("Z", "+00:00")
            v = datetime.fromisoformat(v)
        return v

@tool(args_schema=CheckEquipmentAvailabilityInput)
async def check_equipment_availability_tool(
    start_time_utc: Union[datetime, str], 
    duration_minutes: int,
    requested_items: Optional[List[str]] = None
) -> str:
    """
    Checks the inventory of physical equipment. The AI passes a list of requested keywords 
    to filter the database and retrieve the specific UUIDs and availability for those items.
    """
    if isinstance(start_time_utc, str):
        start_time = datetime.fromisoformat(start_time_utc)
    else:
        start_time = start_time_utc
        
    end_time = start_time + timedelta(minutes=duration_minutes)

    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if requested_items:
            # Convert ['projector', 'mic'] into ['%projector%', '%mic%'] for SQL wildcard search
            search_terms = [f"%{item}%" for item in requested_items]
            
            query = """
                SELECT 
                    ei.id, 
                    ei.name, 
                    ei.total_quantity,
                    COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN be.quantity ELSE 0 END), 0) AS currently_booked,
                    (
                        ei.total_quantity - COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN be.quantity ELSE 0 END), 0)
                    ) AS available_quantity
                FROM equipment_inventory ei
                LEFT JOIN booking_equipment be ON ei.id = be.equipment_id
                LEFT JOIN bookings b ON be.booking_id = b.id 
                    AND b.status = 'CONFIRMED'
                    AND b.start_time < $2 AND b.end_time > $1
                WHERE ei.name ILIKE ANY($3) 
                GROUP BY ei.id, ei.name, ei.total_quantity
                ORDER BY ei.name;
            """
            # asyncpg automatically handles passing the Python list as a Postgres array
            rows = await conn.fetch(query, start_time, end_time, search_terms)
            
        else:
            # Fallback: If AI doesn't pass keywords, return everything
            query = """
                SELECT 
                    ei.id, 
                    ei.name, 
                    ei.total_quantity,
                    COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN be.quantity ELSE 0 END), 0) AS currently_booked,
                    (
                        ei.total_quantity - COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN be.quantity ELSE 0 END), 0)
                    ) AS available_quantity
                FROM equipment_inventory ei
                LEFT JOIN booking_equipment be ON ei.id = be.equipment_id
                LEFT JOIN bookings b ON be.booking_id = b.id 
                    AND b.status = 'CONFIRMED'
                    AND b.start_time < $2 AND b.end_time > $1
                GROUP BY ei.id, ei.name, ei.total_quantity
                ORDER BY ei.name;
            """
            rows = await conn.fetch(query, start_time, end_time)
        
        inventory = []
        for r in rows:
            inventory.append({
                "equipment_id": str(r["id"]),
                "name": r["name"],
                "total_owned": r["total_quantity"],
                "currently_in_use": r["currently_booked"],
                "available_to_book": r["available_quantity"]
            })

        return json.dumps({
            "status": "success",
            "inventory": inventory
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
        print("--- Testing Filtered Equipment Availability ---")
        
        now = datetime.now(timezone.utc)
        tomorrow_2pm = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
        
        test_payload = {
            "start_time_utc": tomorrow_2pm.isoformat(),
            "duration_minutes": 90,
            "requested_items": ["projector", "mic"]  # The AI will pass these!
        }

        print(f"\nChecking availability specifically for: {test_payload['requested_items']}")
        result = await check_equipment_availability_tool.ainvoke(test_payload)
        
        try:
            print(json.dumps(json.loads(result), indent=2))
        except Exception as e:
            print("Raw Response:", result)

    asyncio.run(run_tests())