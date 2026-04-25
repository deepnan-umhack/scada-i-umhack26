# booking_agent.py
from langchain_deepseek import ChatDeepSeek  # NEW: DeepSeek import
from langgraph.prebuilt import create_react_agent

from booking_agent.toolkit import BOOKING_TOOLS
from booking_agent.prompts import BOOKING_AGENT_PROMPT

import os
from dotenv import load_dotenv, find_dotenv

# Load the .env from the parent "agents" directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# 1. Initialize DeepSeek wrapper
# Tool calling (create_react_agent) strictly requires deepseek-chat
llm = ChatDeepSeek(
    model=os.getenv("MODEL", "deepseek-chat"),
    temperature=0,
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    # Note: base_url is usually not needed for the native DeepSeek SDK, 
    # but you can add base_url=os.getenv("DEEPSEEK_API_BASE") if using a proxy.
)

# 2. Create the stateless worker using the 'prompt' argument
booking_worker = create_react_agent(
    model=llm,
    tools=BOOKING_TOOLS,
    prompt=BOOKING_AGENT_PROMPT  
)

# Optional: A wrapper function if your orchestrator needs a specific interface
async def run_booking_worker(messages: list):
    """
    Takes the conversation history from the orchestrator, 
    runs the booking tools, and returns the final response.
    """
    # Prevent infinite loops by hardcapping the number of internal steps
    response = await booking_worker.ainvoke(
        {"messages": messages}, 
        config={"recursion_limit": 25}
    )
    return response["messages"][-1] # Return the final output message