import pytest
from agents.hvac_agent.hvac_agent import hvac_agent

# Use a valid UUID format so the HVAC agent doesn't block on room name resolution
ROOM_UUID = "123e4567-e89b-12d3-a456-426614174000"
pytestmark = pytest.mark.asyncio


@pytest.mark.unit_and_guardrail
async def test_manual_override_success():
    result = await hvac_agent({
        "user_id": "user123",
        "room_id": ROOM_UUID,
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": 26.0,
        "request_id": "test-pause-1"
    })

    text = result["response_text"]

    assert result["request_id"] == "test-pause-1"
    # The agent should attempt HVAC action (not block on room name)
    assert "Final Action:" in text
    assert "HVAC Action Summary" in text


@pytest.mark.unit_and_guardrail
async def test_guardrail_extreme_temperature():
    result = await hvac_agent({
        "user_id": "user123",
        "room_id": ROOM_UUID,
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": -50.0,
        "request_id": "test-guardrail-1"
    })

    text = result["response_text"]

    assert result["request_id"] == "test-guardrail-1"

    # Guardrail must not apply -50°C
    assert "Applied Temperature: -50.0°C" not in text

    # Should mention policy/guardrail behavior — adjusted or blocked
    assert "Applied Temperature: -50.0°C" not in text