import uuid
import json
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from langchain_core.tools import tool

from agents.hvac_agent.core.schemas import UserRequest
from agents.hvac_agent.core.service import handle_hvac_request
from agents.hvac_agent.utils.demo_logger import step


def _parse_target_time(target_time: str) -> datetime:
    """Parse an ISO datetime string with optional trailing Z."""
    normalized = target_time.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    return datetime.fromisoformat(normalized)


def _select_nearest_hour_index(hourly_times: list[str], target: datetime) -> int:
    """Return the index of the forecast hour nearest to target."""
    if target.tzinfo is not None:
        target_dt = target.astimezone(ZoneInfo("Asia/Kuala_Lumpur")).replace(
            minute=0,
            second=0,
            microsecond=0,
            tzinfo=None,
        )
    else:
        target_dt = target.replace(minute=0, second=0, microsecond=0)
    target_iso_hour = target_dt.strftime("%Y-%m-%dT%H:00")

    try:
        return hourly_times.index(target_iso_hour)
    except ValueError:
        best_index = 0
        best_distance_seconds = float("inf")
        for index, hourly_time in enumerate(hourly_times):
            forecast_dt = datetime.fromisoformat(hourly_time)
            distance = abs((forecast_dt - target_dt).total_seconds())
            if distance < best_distance_seconds:
                best_distance_seconds = distance
                best_index = index
        return best_index


@tool
def run_hvac_request(
    user_id: str,
    room_id: str,
    request_type: str,
    requested_temperature_c: float | None = None,
    timestamp: str = "2026-04-20T12:00:00Z",
) -> dict:
    """
    Execute an HVAC request for a room.

    Args:
        user_id: User ID or 'system'
        room_id: Room name or UUID
        request_type: 'SET_TEMPERATURE' or 'NO_USER_REQUEST'
        requested_temperature_c: Desired temperature in Celsius if applicable
        timestamp: ISO timestamp string

    Returns:
        Structured HVAC result including decision, execution, optimizer, and pause state.
    """
    request_id = str(uuid.uuid4())

    step("🛠️", "Tool called: run_hvac_request")
    step("🆔", f"request_id: {request_id}")
    step("👤", f"user_id: {user_id}")
    step("🏢", f"room_id: {room_id}")
    step("📝", f"request_type: {request_type}")

    if requested_temperature_c is not None:
        step("🌡️", f"requested_temperature: {requested_temperature_c}")

    request = UserRequest(
        user_id=user_id,
        room_id=room_id,
        request_type=request_type,
        requested_temperature_c=requested_temperature_c,
        timestamp=timestamp,
        request_id=request_id,
    )

    return handle_hvac_request(request)


@tool
def get_kl_weather_forecast(target_time: str) -> dict:
    """
    Get hourly weather forecast for Kuala Lumpur.

    Args:
        target_time: ISO datetime string, e.g. '2026-04-24T14:00:00+08:00' or UTC with 'Z'

    Returns:
        Forecast dictionary with outdoor temperature and humidity at the requested hour.
    """
    step("🛠️", "Tool called: get_kl_weather_forecast")
    step("🕒", f"target_time: {target_time}")

    try:
        parsed_target_time = _parse_target_time(target_time)
    except ValueError as exc:
        return {
            "status": "failed",
            "target_time": target_time,
            "reason": f"Invalid datetime format: {exc}",
            "forecast": None,
        }

    # Kuala Lumpur coordinates
    latitude = 3.139
    longitude = 101.687
    base_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,relative_humidity_2m",
        "timezone": "Asia/Kuala_Lumpur",
        "forecast_days": 16,
    }
    url = f"{base_url}?{urlencode(params)}"

    try:
        with urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return {
            "status": "failed",
            "target_time": target_time,
            "reason": f"Weather API request failed: {exc}",
            "forecast": None,
        }

    hourly = payload.get("hourly", {})
    times = hourly.get("time") or []
    temperatures = hourly.get("temperature_2m") or []
    humidities = hourly.get("relative_humidity_2m") or []

    if not times or not temperatures or not humidities:
        return {
            "status": "failed",
            "target_time": target_time,
            "reason": "Weather API response missing hourly forecast fields",
            "forecast": None,
        }

    if len(times) != len(temperatures) or len(times) != len(humidities):
        return {
            "status": "failed",
            "target_time": target_time,
            "reason": "Weather API response has inconsistent hourly array lengths",
            "forecast": None,
        }

    selected_index = _select_nearest_hour_index(times, parsed_target_time)

    return {
        "status": "success",
        "location": "Kuala Lumpur",
        "target_time": target_time,
        "forecast_time": times[selected_index],
        "outside_temperature_c": temperatures[selected_index],
        "outside_humidity_percent": humidities[selected_index],
        "units": {
            "temperature": "C",
            "humidity": "%",
        },
        "source": "open-meteo",
    }


@tool
def calculate_weather_aware_precool_start(
    booking_start: str,
    room_id: str = "Room",
) -> dict:
    """
    Calculate optimal pre-cooling start time based on KL weather forecast.
    
    Recommend pre-cool duration based on outside temperature:
    - If outside temp >= 35°C (extreme heat): 30 minutes
    - If outside temp >= 32°C (very hot): 25 minutes
    - If outside temp >= 28°C (hot): 20 minutes
    - Otherwise: 15 minutes

    Args:
        booking_start: ISO datetime string of when the booking begins
        room_id: Room name or ID (for logging)

    Returns:
        Dictionary with calculated pre_cool_start time and reasoning.
    """
    from datetime import datetime, timedelta

    step("🛠️", "Tool called: calculate_weather_aware_precool_start")
    step("📅", f"booking_start: {booking_start}")
    step("🏢", f"room_id: {room_id}")

    try:
        booking_dt = datetime.fromisoformat(booking_start.replace("Z", "+00:00"))
    except ValueError as exc:
        return {
            "status": "failed",
            "reason": f"Invalid booking_start format: {exc}",
            "pre_cool_start": None,
        }

    # Get weather forecast at booking time
    weather_result = get_kl_weather_forecast.invoke({"target_time": booking_start})

    if weather_result.get("status") != "success":
        # Fallback: use 20-minute window if weather unavailable
        fallback_duration = 20
        pre_cool_start_dt = booking_dt - timedelta(minutes=fallback_duration)
        return {
            "status": "success",
            "reason": "Weather unavailable; using default 20-minute window.",
            "outside_temperature_c": None,
            "pre_cool_duration_recommended_min": fallback_duration,
            "pre_cool_start": pre_cool_start_dt.isoformat(),
            "booking_start": booking_start,
        }

    outside_temp = weather_result.get("outside_temperature_c")
    humidity = weather_result.get("outside_humidity_percent")

    # Determine pre-cool duration based on temperature
    if outside_temp >= 35:
        precool_duration_min = 30
        temp_note = "Extreme heat detected; using maximum 30-minute window."
    elif outside_temp >= 32:
        precool_duration_min = 25
        temp_note = "Very hot conditions; using 25-minute window."
    elif outside_temp >= 28:
        precool_duration_min = 20
        temp_note = "Hot conditions; using 20-minute window."
    else:
        precool_duration_min = 15
        temp_note = "Moderate conditions; using 15-minute window."

    pre_cool_start_dt = booking_dt - timedelta(minutes=precool_duration_min)

    return {
        "status": "success",
        "reason": temp_note,
        "outside_temperature_c": outside_temp,
        "outside_humidity_percent": humidity,
        "pre_cool_duration_recommended_min": precool_duration_min,
        "pre_cool_start": pre_cool_start_dt.isoformat(),
        "booking_start": booking_start,
        "room_id": room_id,
    }


HVAC_TOOLS = [run_hvac_request, get_kl_weather_forecast, calculate_weather_aware_precool_start]