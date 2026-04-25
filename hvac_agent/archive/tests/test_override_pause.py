from core.schemas import UserRequest
from core.service import handle_hvac_request

print("=== Step 1: Manual override ===")
override_request = UserRequest(
    user_id="admin_123",
    room_id="Boardroom_A",
    request_type="SET_TEMPERATURE",
    requested_temperature_c=22,
    timestamp="2026-04-19T12:00:00"
)
result1 = handle_hvac_request(override_request)
print(result1)

print("\n=== Step 2: Try optimizer path while override is active ===")
normal_request = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-19T12:01:00"
)
result2 = handle_hvac_request(normal_request)
print(result2)