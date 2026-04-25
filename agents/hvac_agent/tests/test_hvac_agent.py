import asyncio
from agents.hvac_agent.hvac_agent import hvac_agent
from agents.hvac_agent.core.tools import resolve_room_id, get_optimizer_pause_status

async def main():
    room_name = "Huddle Room 1"
    actual_room_id = resolve_room_id(room_name)

    print("\n===== TEST 1: Manual Override Success =====")
    result1 = await hvac_agent({
        "user_id": "user123",
        "room_id": room_name,
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": 26.0,
        "request_id": "test-pause-1"
    })
    print(result1)

    print("\nPause status immediately after TEST 1:")
    print(get_optimizer_pause_status(actual_room_id))

    print("\n===== TEST 2: System Optimization Blocked By Active Override =====")
    result2 = await hvac_agent({
        "user_id": "system",
        "room_id": room_name,
        "request_type": "NO_USER_REQUEST",
        "request_id": "test-blocked-1"
    })
    print(result2)

    print("\nPause status immediately after TEST 2:")
    print(get_optimizer_pause_status(actual_room_id))

if __name__ == "__main__":
    asyncio.run(main())