import uuid
import os

from dotenv import load_dotenv, find_dotenv

# Load the .env from the parent "agents" directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from langchain_deepseek import ChatDeepSeek  # NEW: DeepSeek import
from langgraph.prebuilt import create_react_agent

from hvac_agent.hvac_toolkit import HVAC_TOOLS
from hvac_agent.hvac_prompts import HVAC_AGENT_PROMPT

# ==========================================
# MODEL INITIALIZATION
# ==========================================
# Tool calling (create_react_agent) strictly requires deepseek-chat
llm = ChatDeepSeek(
    model=os.getenv("MODEL", "deepseek-chat"), 
    temperature=0,
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    # Note: base_url is usually not needed for native DeepSeek SDK, 
    # but you can add base_url=os.getenv("DEEPSEEK_API_BASE") if you use a proxy.
)

hvac_worker = create_react_agent(
    model=llm,
    tools=HVAC_TOOLS,
    prompt=HVAC_AGENT_PROMPT,
)


async def run_hvac_worker(messages: list):
    """
    Takes conversation history from the orchestrator,
    runs the HVAC worker, and returns the final response message.
    """
    response = await hvac_worker.ainvoke(
        {"messages": messages},
        config={"recursion_limit": 25}
    )
    return response["messages"][-1]


def _build_command_from_structured_input(payload: dict) -> str:
    """Convert legacy structured HVAC payloads into a compact command sentence."""
    user_id = payload.get("user_id", "unknown")
    room_id = payload.get("room_id", "unknown room")
    request_type = payload.get("request_type", "NO_USER_REQUEST")
    requested_temperature_c = payload.get("requested_temperature_c")

    if requested_temperature_c is not None:
        return (
            f"User '{user_id}' requested '{request_type}' in room '{room_id}' "
            f"with requested temperature {requested_temperature_c}°C."
        )

    return f"User '{user_id}' requested '{request_type}' in room '{room_id}'."


async def hvac_agent(input_data: str | dict, request_id: str | None = None) -> dict:
    """
    HVAC wrapper for orchestrator / external calls.

    Supports two input styles:
    - Natural-language command text (preferred for orchestrator delegation)
    - Legacy structured dict payload (backward compatible)

    Returns a normalized response envelope with request_id and response_text.
    """
    if isinstance(input_data, str):
        command_text = input_data.strip()
        resolved_request_id = request_id or str(uuid.uuid4())
    elif isinstance(input_data, dict):
        # Preferred dict path for orchestrator: pass natural language in "command".
        command_text = (
            input_data.get("command")
            or input_data.get("command_text")
            or input_data.get("text")
            or ""
        )

        if isinstance(command_text, str):
            command_text = command_text.strip()
        else:
            command_text = ""

        if not command_text:
            command_text = _build_command_from_structured_input(input_data)

        resolved_request_id = request_id or input_data.get("request_id") or str(uuid.uuid4())
    else:
        raise TypeError("hvac_agent input_data must be a string or dict")

    if not command_text:
        raise ValueError("Empty HVAC command text")

    messages = [
        {"role": "user", "content": command_text}
    ]

    final_message = await run_hvac_worker(messages)

    return {
        "request_id": resolved_request_id,
        "response_text": getattr(final_message, "content", str(final_message)),
    }