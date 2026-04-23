import json
import uuid
import os
import asyncpg
from datetime import datetime, timezone
from dotenv import load_dotenv, find_dotenv
from langchain_core.tools import tool
from pydantic import BaseModel, Field

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

class GenerateReportInput(BaseModel):
    start_date: str = Field(..., description="The start date of the reporting period.")
    end_date: str = Field(..., description="The end date of the reporting period.")
    total_energy_kwh: float = Field(..., description="Total energy consumed in kWh.")
    carbon_emissions_kg: float = Field(..., description="Total estimated carbon emissions in kg.")
    hvac_efficiency: int = Field(..., description="The average HVAC system efficiency score.")
    requested_by: str = Field("System Admin", description="The admin user requesting the report.")

@tool(args_schema=GenerateReportInput)
async def generate_esg_report_tool(start_date: str, end_date: str, total_energy_kwh: float, carbon_emissions_kg: float, hvac_efficiency: int, requested_by: str = "System Admin") -> str:
    """
    Creates and saves the final official ESG report record into the database, using the metrics gathered.
    """
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        return json.dumps({"error": "Invalid date format. Please use ISO 8601."})

    if not DATABASE_URL:
        return json.dumps({"error": "DATABASE_URL is not configured."})

    try:
        report_id = f"ESG-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"
        sustainability_status = "Optimal" if hvac_efficiency >= 90 else "Requires Optimization"
        
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            query = """
                INSERT INTO esg_reports (
                    id, period_start, period_end, generated_by, 
                    total_energy_kwh, carbon_footprint_kg, 
                    hvac_efficiency_rating, sustainability_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """
            await conn.execute(
                query,
                report_id,
                start_dt,
                end_dt,
                requested_by,
                total_energy_kwh,
                carbon_emissions_kg,
                hvac_efficiency,
                sustainability_status
            )
        finally:
            await conn.close()
        
        return json.dumps({
            "status": "success",
            "message": "Successfully generated and saved ESG Report.",
            "report_id": report_id,
            "summary": {
                "id": report_id,
                "period_start": start_date,
                "period_end": end_date,
                "generated_by": requested_by,
                "total_energy_kwh": total_energy_kwh,
                "carbon_footprint_kg": carbon_emissions_kg,
                "hvac_efficiency_rating": hvac_efficiency,
                "sustainability_status": sustainability_status
            }
        })
        
    except Exception as e:
        return f"ERROR - Failed to generate ESG report: {str(e)}"