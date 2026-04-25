# tests/test_optimizer_integration.py

from core.schemas import UserRequest
from core.service import handle_hvac_request


def run_test(title: str, request: UserRequest):
    print(f"\n===== {title} =====")
    result = handle_hvac_request(request)
    print(result)
    return result


# Scenario 1 — Optimizer success on current main room
request_success = UserRequest(
    user_id="system",
    room_id="Huddle Room 1",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-20T12:00:00Z"
)

run_test("Optimizer Success", request_success)


# Scenario 2 — Alternate room / older flow case
request_alt = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-19T13:40:00"
)

run_test("Optimizer Alternate Room Flow", request_alt)