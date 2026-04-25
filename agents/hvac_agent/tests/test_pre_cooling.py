from hvac_agent.core.schemas import RoomState, PolicyConstraints
from hvac_agent.core.controller import hvac_controller

room = RoomState(
    room_id="Boardroom_A",
    temperature_c=28.0,
    humidity_percent=65.0,
    occupied=False,
    occupancy_count=0,
    occupancy_confidence=0.95,
    ac_on=True,
    current_setpoint_c=26.0,
    fan_speed="LOW",
    mode="COOL",
    last_updated="2026-04-19T13:40:00"
)

policy = PolicyConstraints(
    min_temperature_c=22.0,
    max_temperature_c=26.0,
    max_override_duration_min=60,
    pre_cooling_window_min=30,
    allow_cooling_when_unoccupied=False
)

decision = hvac_controller(
    room_state=room,
    user_request=None,
    policy=policy
)

print(decision)