from core.schemas import RoomState, PolicyConstraints, BookingContext
from core.controller import hvac_controller

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

booking = BookingContext(
    is_booked_now=False,
    next_booking_start="2026-04-19T14:00:00",
    next_booking_end="2026-04-19T15:00:00",
    minutes_until_next_booking=20,
    booking_title="Team Strategy Meeting"
)

decision = hvac_controller(
    room_state=room,
    user_request=None,
    policy=policy,
    booking=booking
)

print(decision)