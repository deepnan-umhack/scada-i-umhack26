from langchain_core.tools import tool
import json
import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

@tool
def analyze_hvac_compliance_tool(start_date: str, end_date: str) -> str:
    """
    Audits the SCADA sensor history to check for energy wastage, such as AC running in empty rooms.
    Provides the Governance compliance score for the ESG report.
    
    Args:
        start_date (str): Start of the period.
        end_date (str): End of the period.
        
    Returns:
        str: JSON string detailing policy violations and a compliance score.
    """
    try:
        # Fetching records where power is being consumed
        response = supabase.table('room_sensor_history') \
            .select('is_occupied, power_kw, ac_temp_setting') \
            .gte('timestamp', start_date) \
            .lte('timestamp', end_date) \
            .gt('power_kw', 0) \
            .execute()
            
        data = response.data
        if not data:
            return json.dumps({"error": "No active HVAC data to audit for this period."})

        total_active_records = len(data)
        
        # Policy Violation 1: AC running while room is completely unoccupied
        wasted_energy_incidents = sum(1 for row in data if row.get('is_occupied') == 0)
        
        # Policy Violation 2: AC set below eco-standard (e.g., below 22C)
        try:
            extreme_cooling_incidents = sum(1 for row in data if float(row.get('ac_temp_setting', 24)) < 22.0)
        except (ValueError, TypeError):
            extreme_cooling_incidents = 0
            
        # Calculate a rough compliance score out of 100
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
        return f"ERROR - Failed to analyze HVAC compliance: {str(e)}"