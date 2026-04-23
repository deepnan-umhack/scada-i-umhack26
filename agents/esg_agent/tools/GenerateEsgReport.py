from langchain_core.tools import tool
import json
import uuid
import os
from datetime import datetime, timezone
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

@tool
def generate_esg_report_tool(start_date: str, end_date: str, total_energy_kwh: float, carbon_emissions_kg: float, hvac_efficiency: int, requested_by: str = "System Admin") -> str:
    """
    Creates and saves the final official ESG report record into the database, using the metrics gathered.
    
    Args:
        start_date (str): The start date of the reporting period.
        end_date (str): The end date of the reporting period.
        total_energy_kwh (float): Total energy consumed in kWh.
        carbon_emissions_kg (float): Total estimated carbon emissions in kg.
        hvac_efficiency (int): The average HVAC system efficiency score.
        requested_by (str): The admin user requesting the report.
        
    Returns:
        str: A JSON string containing the generation status and the new report ID.
    """
    try:
        report_id = f"ESG-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"
        sustainability_status = "Optimal" if hvac_efficiency >= 90 else "Requires Optimization"
        
        # Map parameters to the new esg_reports schema
        report_record = {
            "id": report_id,
            "period_start": start_date,
            "period_end": end_date,
            "generated_by": requested_by,
            "total_energy_kwh": total_energy_kwh,
            "carbon_footprint_kg": carbon_emissions_kg,
            "hvac_efficiency_rating": hvac_efficiency,
            "sustainability_status": sustainability_status
        }
        
        # Insert into database
        response = supabase.table('esg_reports').insert(report_record).execute()
        
        return json.dumps({
            "status": "success",
            "message": "Successfully generated and saved ESG Report.",
            "report_id": report_id,
            "summary": report_record
        })
        
    except Exception as e:
        return f"ERROR - Failed to generate ESG report: {str(e)}"