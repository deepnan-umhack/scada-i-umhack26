from core.schemas import UserRequest
from core.service import handle_hvac_request


def print_section(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


# ==========================================
# DEMO 1 — Pre-Cooling Trigger
# ==========================================
print_section("SYSTEM DEMO 1 — Pre-Cooling Trigger")

# No user request → system trigger
pre_cooling_request = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-20T13:40:00"
)

result1 = handle_hvac_request(pre_cooling_request)
print(result1)


# ==========================================
# DEMO 2 — Normal Optimization (Occupied Room)
# ==========================================
print_section("SYSTEM DEMO 2 — Normal Optimization")

normal_request = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-20T10:00:00"
)

result2 = handle_hvac_request(normal_request)
print(result2)


# ==========================================
# DEMO 3 — Override then Optimizer Blocked
# ==========================================
print_section("SYSTEM DEMO 3 — Override then Optimizer Blocked")

# Step 1: User override
override_request = UserRequest(
    user_id="admin_001",
    room_id="Boardroom_A",
    request_type="SET_TEMPERATURE",
    requested_temperature_c=22.0,
    timestamp="2026-04-20T14:00:00"
)

override_result = handle_hvac_request(override_request)
print("\n--- Override Applied ---")
print(override_result)

# Step 2: System tries optimization immediately after
optimizer_attempt = UserRequest(
    user_id="system",
    room_id="Boardroom_A",
    request_type="NO_USER_REQUEST",
    requested_temperature_c=None,
    timestamp="2026-04-20T14:05:00"
)

blocked_result = handle_hvac_request(optimizer_attempt)
print("\n--- Optimizer Attempt While Paused ---")
print(blocked_result)