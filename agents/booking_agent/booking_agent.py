# booking_agent.py
# from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from booking_agent.toolkit import BOOKING_TOOLS
from booking_agent.prompts import BOOKING_AGENT_PROMPT

import os
from dotenv import load_dotenv, find_dotenv

# Load the .env from the parent "agents" directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# 1. Initialize Gemini
llm = ChatOpenAI(
    model="ilmu-glm-5.1",
    temperature=0,
    api_key=os.getenv("Z_AI_API_KEY"),
    base_url=os.getenv("Z_AI_BASE_URL"), 
    
)

# 2. Create the stateless worker using the NEW 'prompt' argument
booking_worker = create_react_agent(
    model=llm,
    tools=BOOKING_TOOLS,
    prompt=BOOKING_AGENT_PROMPT  # <--- This replaces state_modifier!
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