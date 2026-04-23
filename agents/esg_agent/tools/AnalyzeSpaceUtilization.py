from langchain_core.tools import tool
import json
import os
from supabase import create_client, Client
from datetime import datetime

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

@tool
def analyze_space_utilization_tool(start_date: str, end_date: str) -> str:
    """
    Analyzes room booking data to determine space utilization efficiency (Social/Operational ESG metric).
    
    Args:
        start_date (str): The start date of the reporting period (e.g., "2026-01-01T00:00:00Z").
        end_date (str): The end date of the reporting period.
        
    Returns:
        str: JSON string containing total bookings, hours booked, and utilization score.
    """
    try:
        response = supabase.table('bookings') \
            .select('start_time, end_time, status') \
            .gte('start_time', start_date) \
            .lte('start_time', end_date) \
            .neq('status', 'CANCELLED') \
            .execute()
            
        bookings = response.data
        if not bookings:
             return json.dumps({"status": "success", "message": "No bookings found in this period.", "total_hours_booked": 0})

        total_hours = 0
        for b in bookings:
            # Parse ISO formats to calculate duration
            # Note: Handle timezone awareness based on your strict string format
            start = datetime.fromisoformat(b['start_time'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(b['end_time'].replace('Z', '+00:00'))
            duration = (end - start).total_seconds() / 3600
            total_hours += duration
            
        return json.dumps({
            "status": "success",
            "metrics": {
                "total_valid_bookings": len(bookings),
                "total_hours_utilized": round(total_hours, 2),
                "space_efficiency_rating": "High" if total_hours > 100 else "Moderate"
            }
        })
        
    except Exception as e:
        return f"ERROR - Failed to analyze space utilization: {str(e)}"