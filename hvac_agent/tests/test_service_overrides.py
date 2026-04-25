from core.schemas import UserRequest
from core.service import handle_hvac_request

tests = [
    UserRequest(
        user_id="admin_123",
        room_id="Boardroom_A",
        request_type="SET_TEMPERATURE",
        requested_temperature_c=16,
        timestamp="2026-04-19T11:05:00"
    ),
    UserRequest(
        user_id="admin_123",
        room_id="Boardroom_A",
        request_type="SET_TEMPERATURE",
        requested_temperature_c=22,
        timestamp="2026-04-19T11:06:00"
    ),
    UserRequest(
        user_id="admin_123",
        room_id="Boardroom_A",
        request_type="SET_TEMPERATURE",
        requested_temperature_c=30,
        timestamp="2026-04-19T11:07:00"
    )
]

for i, request in enumerate(tests, start=1):
    print(f"\n=== Test {i} ===")
    result = handle_hvac_request(request)
    print(result)