import os
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from agents.hvac_toolkit import HVAC_TOOLS
from agents.hvac_prompts import HVAC_AGENT_PROMPT

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

ILMU_API_KEY = os.getenv("ILMU_API_KEY")
ILMU_MODEL = os.getenv("ILMU_MODEL", "ilmu-glm-5.1")
ILMU_BASE_URL = os.getenv("ILMU_BASE_URL", "https://api.ilmu.ai/v1")

if not ILMU_API_KEY:
    raise ValueError("Missing ILMU_API_KEY in environment")

llm = ChatOpenAI(
    api_key=ILMU_API_KEY,
    base_url=ILMU_BASE_URL,
    model=ILMU_MODEL,
    temperature=0,
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


async def hvac_agent(input: dict) -> dict:
    """
    Wrapper function for orchestrator / external agent calls.

    Accepts a structured dict input, converts it into a user message,
    runs the HVAC LangGraph worker, and returns a structured response.

    Expected input example:
    {
        "user_id": "user123",
        "room_id": "Huddle Room 1",
        "request_type": "SET_TEMPERATURE",
        "requested_temperature_c": 24.0,
        "request_id": "abc-123"
    }
    """
    user_id = input.get("user_id", "unknown")
    room_id = input.get("room_id", "unknown room")
    request_type = input.get("request_type", "NO_USER_REQUEST")
    requested_temperature_c = input.get("requested_temperature_c")
    request_id = input.get("request_id")

    if requested_temperature_c is not None:
        user_message = (
            f"User {user_id} requests {request_type} for room {room_id} "
            f"with requested temperature {requested_temperature_c}°C."
        )
    else:
        user_message = (
            f"User {user_id} requests {request_type} for room {room_id}."
        )

    messages = [
        {"role": "user", "content": user_message}
    ]

    final_message = await run_hvac_worker(messages)

    return {
        "request_id": request_id,
        "response_text": getattr(final_message, "content", str(final_message)),
    }