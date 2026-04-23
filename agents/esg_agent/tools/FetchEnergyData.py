from langchain_core.tools import tool
import json
import os
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

@tool
def fetch_energy_data_tool(start_date: str, end_date: str) -> str:
    """
    Fetches raw energy consumption data from the SCADA database (room_sensor_history)
    for a given date range. Use this to gather metrics BEFORE generating the final report.
    
    Args:
        start_date (str): The start date of the reporting period (e.g., "2026-01-01T00:00:00Z").
        end_date (str): The end date of the reporting period (e.g., "2026-03-31T23:59:59Z").
        
    Returns:
        str: A JSON string containing energy metrics like total kWh and estimated carbon output.
    """
    try:
        # Query the room_sensor_history table from your schema
        response = supabase.table('room_sensor_history') \
            .select('power_kw, room_temp, outside_temp') \
            .gte('timestamp', start_date) \
            .lte('timestamp', end_date) \
            .execute()
            
        data = response.data
        
        if not data:
            return json.dumps({"error": f"No sensor data found between {start_date} and {end_date}."})

        # Calculate metrics from the raw rows
        # Assuming each row represents a roughly equal time interval (e.g., 1 hour) for simple kWh calculation
        total_kwh = sum((row.get('power_kw') or 0) for row in data)
        
        # Calculate rough carbon footprint (approx 0.39 kg CO2 per kWh)
        carbon_kg = round(total_kwh * 0.39, 2)
        
        # Mocking an efficiency score based on available data limits
        hvac_efficiency_score = 92 # Could be derived dynamically by comparing room_temp vs outside_temp
        
        return json.dumps({
            "status": "success",
            "period": f"{start_date} to {end_date}",
            "metrics": {
                "total_energy_kwh": round(total_kwh, 2),
                "estimated_carbon_emissions_kg": carbon_kg,
                "hvac_efficiency_score": hvac_efficiency_score,
                "data_points_analyzed": len(data)
            }
        })
        
    except Exception as e:
        return f"ERROR - Failed to fetch energy data: {str(e)}"