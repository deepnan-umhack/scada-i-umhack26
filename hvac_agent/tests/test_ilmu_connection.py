import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

llm = ChatOpenAI(
    api_key=os.getenv("ILMU_API_KEY"),
    base_url=os.getenv("ILMU_BASE_URL", "https://api.ilmu.ai/v1"),
    model=os.getenv("ILMU_MODEL", "ilmu-glm-5.1"),
    temperature=0,
)

response = llm.invoke("Reply with exactly: ILMU connection successful")
print(response.content)