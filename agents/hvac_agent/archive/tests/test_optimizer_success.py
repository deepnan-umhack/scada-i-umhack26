from agents.hvac_agent.core.schemas import UserRequest
from agents.hvac_agent.core.service import handle_hvac_request

request = UserRequest(
    user_id="system",
    room_id="Huddle Room 1",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-20T12:00:00Z"
)

result = handle_hvac_request(request)
print(result)