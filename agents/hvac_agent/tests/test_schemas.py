from agents.hvac_agent.core.schemas import RoomState

room = RoomState(
    room_id="Boardroom_A",
    temperature_c=26.5,
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

print(room)