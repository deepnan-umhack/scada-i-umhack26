from core.schemas import UserRequest
from core.service import handle_hvac_request

request = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-19T13:40:00"
)

result = handle_hvac_request(request)
print(result)