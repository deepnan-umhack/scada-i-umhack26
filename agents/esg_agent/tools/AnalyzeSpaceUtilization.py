import json
import os
import asyncpg
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from langchain_core.tools import tool
from pydantic import BaseModel, Field

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

class SpaceUtilizationInput(BaseModel):
    start_date: str = Field(..., description="Start date of the reporting period (e.g. '2026-01-01T00:00:00Z').")
    end_date: str = Field(..., description="End date of the reporting period (e.g. '2026-03-31T23:59:59Z').")

@tool(args_schema=SpaceUtilizationInput)
async def analyze_space_utilization_tool(start_date: str, end_date: str) -> str:
    """
    Analyzes room booking data to determine space utilization efficiency (Social/Operational ESG metric).
    """
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        return json.dumps({"error": "Invalid date format. Please use ISO 8601."})

    if not DATABASE_URL:
        return json.dumps({"error": "DATABASE_URL is not configured."})

    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            query = """
                SELECT start_time, end_time, status 
                FROM bookings 
                WHERE start_time >= $1 AND start_time <= $2 AND status != 'CANCELLED'
            """
            rows = await conn.fetch(query, start_dt, end_dt)
        finally:
            await conn.close()

        if not rows:
             return json.dumps({"status": "success", "message": "No bookings found in this period.", "total_hours_booked": 0})

        total_hours = 0
        for b in rows:
            duration = (b['end_time'] - b['start_time']).total_seconds() / 3600
            total_hours += duration
            
        return json.dumps({
            "status": "success",
            "metrics": {
                "total_valid_bookings": len(rows),
                "total_hours_utilized": round(total_hours, 2),
                "space_efficiency_rating": "High" if total_hours > 100 else "Moderate"
            }
        })
        
    except Exception as e:
        return f"ERROR - Failed to analyze space utilization: {str(e)}"