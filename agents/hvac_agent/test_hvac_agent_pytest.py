import pytest
from agents.hvac_agent import hvac_agent
import asyncio

ROOM_NAME = "Huddle Room 1"
pytestmark = pytest.mark.asyncio 

@pytest.mark.unit_and_guardrail
async def test_manual_override_success():
    result = await hvac_agent({
        "user_id": "user123",
        "room_id": ROOM_NAME,
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": 26.0,
        "request_id": "test-pause-1"
    })

    text = result["response_text"]

    assert result["request_id"] == "test-pause-1"
    assert "Final Action: SET_HVAC" in text
    assert "Applied Temperature: 26.0°C" in text
    assert "Optimizer is paused" in text


@pytest.mark.unit_and_guardrail  
async def test_guardrail_extreme_temperature():
    result = await hvac_agent({
        "user_id": "user123",
        "room_id": ROOM_NAME,
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": -50.0,
        "request_id": "test-guardrail-1"
    })

    text = result["response_text"]

    assert result["request_id"] == "test-guardrail-1"

    # Guardrail must not apply -50°C
    assert "Applied Temperature: -50.0°C" not in text

    # It should clamp to safe policy minimum
    assert "Adjusted to 22.0°C" in text or "Applied Temperature: 22.0°C" in text

    # Should clearly mention policy/guardrail behavior
    assert "below minimum" in text