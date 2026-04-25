from hvac_agent.core.schemas import RoomState, UserRequest, PolicyConstraints
from hvac_agent.core.controller import hvac_controller


room = RoomState(
    room_id="Boardroom_A",
    temperature_c=27,
    humidity_percent=70,
    occupied=True,
    occupancy_count=5,
    occupancy_confidence=0.9,
    ac_on=True,
    current_setpoint_c=24,
    fan_speed="MEDIUM",
    mode="COOL",
    last_updated="2026-04-19T10:30:00"
)

request = UserRequest(
    user_id="admin_123",
    room_id="Boardroom_A",
    request_type="SET_TEMPERATURE",
    requested_temperature_c=16,
    timestamp="2026-04-19T10:31:00"
)

policy = PolicyConstraints(
    min_temperature_c=22,
    max_temperature_c=26,
    max_override_duration_min=60,
    pre_cooling_window_min=30,
    allow_cooling_when_unoccupied=False
)

decision = hvac_controller(room, request, policy)

print(decision)