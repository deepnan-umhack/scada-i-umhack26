import json
import os
import asyncpg
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from langchain_core.tools import tool
from pydantic import BaseModel, Field

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

class AnalyzeHvacInput(BaseModel):
    start_date: str = Field(..., description="Start of the period (e.g. '2026-01-01T00:00:00Z').")
    end_date: str = Field(..., description="End of the period (e.g. '2026-03-31T23:59:59Z').")

@tool(args_schema=AnalyzeHvacInput)
async def analyze_hvac_compliance_tool(start_date: str, end_date: str) -> str:
    """
    Audits the SCADA sensor history to check for energy wastage, such as AC running in empty rooms.
    Provides the Governance compliance score for the ESG report.
    """
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        return "ERROR: Invalid date format. Please use ISO 8601 (e.g., YYYY-MM-DDTHH:MM:SSZ). DO NOT RETRY."

    if not DATABASE_URL:
        return "CRITICAL ERROR: DATABASE_URL is not configured. DO NOT RETRY."

    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            # Using TO_TIMESTAMP forces Postgres to parse your DD/MM/YYYY text correctly
            query = """
                SELECT is_occupied, power_kw, ac_temp_setting 
                FROM room_sensor_history 
                WHERE TO_TIMESTAMP(timestamp, 'DD/MM/YYYY HH24:MI') >= $1 
                  AND TO_TIMESTAMP(timestamp, 'DD/MM/YYYY HH24:MI') <= $2 
                  AND power_kw > 0
            """
            rows = await conn.fetch(query, start_dt, end_dt)
        finally:
            await conn.close()

        if not rows:
            return f"ERROR: No active HVAC data to audit for the period {start_date} to {end_date}. Report this finding directly to the user. DO NOT RETRY."

        total_active_records = len(rows)
        wasted_energy_incidents = sum(1 for row in rows if not row.get('is_occupied'))
        extreme_cooling_incidents = 0
        
        for row in rows:
            try:
                temp_setting = row.get('ac_temp_setting')
                if temp_setting is not None and float(temp_setting) < 22.0:
                    extreme_cooling_incidents += 1
            except (ValueError, TypeError):
                pass
            
        violation_rate = (wasted_energy_incidents + extreme_cooling_incidents) / total_active_records
        compliance_score = max(0, min(100, round(100 - (violation_rate * 100))))

        return json.dumps({
            "status": "success",
            "audit_results": {
                "total_operational_hours_checked": total_active_records,
                "unoccupied_wastage_incidents": wasted_energy_incidents,
                "extreme_cooling_policy_violations": extreme_cooling_incidents,
                "eco_policy_compliance_score": compliance_score
            }
        })
        
    except Exception as e:
        return f"CRITICAL ERROR - Failed to analyze HVAC compliance: {str(e)}. DO NOT RETRY."