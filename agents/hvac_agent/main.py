import asyncio
from agents.hvac_agent.hvac_agent import hvac_agent


async def main():
    print("\n===== HVAC MAIN ENTRY =====")

    result = await hvac_agent({
        "user_id": "user123",
        "room_id": "Huddle Room 1",
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": 24.0,
        "request_id": "main-test-1"
    })

    print("\n===== RESULT =====")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())