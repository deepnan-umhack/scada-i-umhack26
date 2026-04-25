from agents.hvac_agent.hvac_toolkit import run_hvac_request

print("\n===== TEST 1: Manual Override That Changes Setpoint =====")
run_hvac_request.invoke({
    "user_id": "user123",
    "room_id": "Huddle Room 1",
    "request_type": "SET_TEMPERATURE",
    "requested_temperature_c": 24.0
})
