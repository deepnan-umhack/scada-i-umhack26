import asyncio
import asyncpg
import os
import json
from typing import Union
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field, field_validator
from langchain_core.tools import tool

# Load env variables (searching parent directories to avoid the folder trap!)
load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Pydantic Schema
# ------------------------------------------------------------------
class UpdateBookingStatusInput(BaseModel):
    booking_id: str = Field(..., description="The UUID of the booking to update.")
    new_status: str = Field(..., description="The new status to apply (e.g., 'CANCELLED', 'CONFIRMED').")
    source_prompt: str = Field(
        ...,
        description="Prompt that led to this status update (for example, a cancellation request)."
    )

    @field_validator("new_status")
    @classmethod
    def format_status(cls, v: str):
        # Enforce uppercase for database consistency
        return v.strip().upper()

# ------------------------------------------------------------------
# 2. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=UpdateBookingStatusInput)
async def update_booking_status_tool(
    booking_id: str,
    new_status: str,
    source_prompt: str,
) -> str:
    """
    Updates the status of an existing booking (used primarily for cancellations).
    Pass this directly to your async LangGraph node.
    """
    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_prompt TEXT;"
        )

        query = """
            UPDATE bookings 
            SET status = $1,
                source_prompt = COALESCE($3, source_prompt)
            WHERE id = $2
            RETURNING id;
        """
        
        # Execute the update and fetch the ID of the updated row
        updated_id = await conn.fetchval(
            query, 
            new_status, 
            booking_id,
            source_prompt,
        )
        
        # If fetchval returns None, it means the WHERE clause didn't match any rows
        if not updated_id:
            return json.dumps({
                "status": "not_found",
                "message": f"No booking found with ID {booking_id}."
            })
            
        return json.dumps({
            "status": "success",
            "message": f"Booking successfully updated to {new_status}."
        })

    except asyncpg.exceptions.DataError as e:
        # Catches UUID format errors (e.g., if the LLM passes "123" instead of a UUID)
        return json.dumps({
            "status": "error", 
            "message": f"Invalid data format. Ensure booking_id is a valid UUID. Details: {str(e)}"
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
        print("--- Testing Update Booking Status Tool ---")
        
        # IMPORTANT: I pasted the successful booking_id from your previous test here!
        test_payload = {
            "booking_id": "6ee53cd9-4e96-4ab0-b057-e527be7849f8", 
            "new_status": "Cancelled",
            "source_prompt": "Please cancel my booking for this afternoon."
        }

        print(f"\nAttempting to update booking {test_payload['booking_id']} to '{test_payload['new_status']}'...")
        result = await update_booking_status_tool(**test_payload)
        print("Response:", result)

    # Run the async test loop
    asyncio.run(run_tests())