from agents.hvac_agent.core.schemas import UserRequest
from agents.hvac_agent.core.service import handle_hvac_request


def detect_intent(user_message: str) -> str:
    """
    Very simple rule-based intent detection.
    Later, this can be replaced by an LLM or LangGraph router.
    """
    msg = user_message.lower()

    if "temperature" in msg or "ac" in msg or "hot" in msg or "cold" in msg:
        return "HVAC"

    if "book" in msg or "booking" in msg or "reserve" in msg:
        return "BOOKING"

    if "esg" in msg or "energy report" in msg or "policy" in msg:
        return "ESG"

    return "UNKNOWN"


def extract_hvac_request(user_id: str, room_id: str, user_message: str) -> UserRequest:
    """
    Simple parser for HVAC-related requests.
    Later, this can be replaced by LLM-based structured extraction.
    """
    msg = user_message.lower()

    requested_temperature = None
    request_type = "NO_USER_REQUEST"

    # Simple number extraction for temperatures like '22', '22c', '22°C'
    tokens = msg.replace("°", "").replace("c", " ").split()
    for token in tokens:
        try:
            value = float(token)
            requested_temperature = value
            request_type = "SET_TEMPERATURE"
            break
        except ValueError:
            continue

    return UserRequest(
        user_id=user_id,
        room_id=room_id,
        request_type=request_type,
        requested_temperature_c=requested_temperature,
        timestamp="2026-04-20T12:00:00"
    )


def booking_agent_stub(user_message: str) -> dict:
    """
    Placeholder for teammate Booking Agent.
    """
    return {
        "agent": "BOOKING",
        "status": "stub",
        "message": "Booking agent not yet integrated."
    }


def esg_agent_stub(user_message: str) -> dict:
    """
    Placeholder for teammate ESG Agent.
    """
    return {
        "agent": "ESG",
        "status": "stub",
        "message": "ESG agent not yet integrated."
    }


def orchestrate(user_id: str, room_id: str, user_message: str) -> dict:
    """
    Main orchestrator entry point.
    Routes the request to the appropriate agent.
    """
    intent = detect_intent(user_message)

    if intent == "HVAC":
        hvac_request = extract_hvac_request(user_id, room_id, user_message)
        hvac_result = handle_hvac_request(hvac_request)

        return {
            "orchestrator_intent": "HVAC",
            "agent_called": "HVAC Agent",
            "result": hvac_result
        }

    elif intent == "BOOKING":
        booking_result = booking_agent_stub(user_message)
        return {
            "orchestrator_intent": "BOOKING",
            "agent_called": "Booking Agent",
            "result": booking_result
        }

    elif intent == "ESG":
        esg_result = esg_agent_stub(user_message)
        return {
            "orchestrator_intent": "ESG",
            "agent_called": "ESG Agent",
            "result": esg_result
        }

    return {
        "orchestrator_intent": "UNKNOWN",
        "agent_called": None,
        "result": {
            "status": "unhandled",
            "message": "Could not determine which agent should handle this request."
        }
    }