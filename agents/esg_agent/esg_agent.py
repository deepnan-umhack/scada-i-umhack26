# esg_agent.py
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from esg_agent.toolkit import ESG_TOOLS
from esg_agent.prompts import ESG_AGENT_PROMPT

import os
from dotenv import load_dotenv

# Load the .env from the parent "agents" directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# 1. Initialize Gemini/OpenAI wrapper
llm = ChatOpenAI(
    model="ilmu-glm-5.1",
    temperature=0,
    api_key=os.getenv("Z_AI_API_KEY"),
    base_url=os.getenv("Z_AI_BASE_URL"), 
)

# 2. Create the stateless worker
esg_worker = create_react_agent(
    model=llm,
    tools=ESG_TOOLS,
    prompt=ESG_AGENT_PROMPT 
)

async def run_esg_worker(messages: list):
    """
    Takes the conversation history from the orchestrator, 
    runs the ESG tools, and returns the final response.
    """
    # Prevent infinite loops by hardcapping the number of internal steps
    response = await esg_worker.ainvoke(
        {"messages": messages}, 
        config={"recursion_limit": 25}
    )
    return response["messages"][-1] # Return the final output message