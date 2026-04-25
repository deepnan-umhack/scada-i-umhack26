import uuid

from langchain_core.tools import tool

from core.schemas import UserRequest
from core.service import handle_hvac_request
from utils.demo_logger import step


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


HVAC_TOOLS = [run_hvac_request]