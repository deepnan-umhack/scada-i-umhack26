from agents.hvac_toolkit import run_hvac_request
from core.tools import optimizer_pause_state

print("\n===== TEST 1: Manual Override That Changes Setpoint =====")
optimizer_pause_state.clear()
run_hvac_request.invoke({
    "user_id": "user123",
    "room_id": "Huddle Room 1",
    "request_type": "SET_TEMPERATURE",
    "requested_temperature_c": 24.0
})
