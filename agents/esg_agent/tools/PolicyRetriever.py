import json
import os
import asyncio
from dotenv import load_dotenv, find_dotenv
from supabase.client import create_client
from langchain_core.tools import tool
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pydantic import BaseModel, Field

load_dotenv(find_dotenv())

class SearchPolicyInput(BaseModel):
    query: str = Field(..., description="The policy question or compliance rule to look up.")

def _build_clients():
    """Initializes and returns the Google Embedding model and Supabase client."""
    google_api_key = os.getenv("GOOGLE_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    # Reverted to match your working ingestion setup exactly!
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=google_api_key,
        task_type="retrieval_query",
        output_dimensionality=768
    )

    supabase = create_client(supabase_url, supabase_key)
    return embeddings, supabase


@tool(args_schema=SearchPolicyInput)
async def search_esg_policy_tool(query: str) -> str:
    """
    Searches the official UTM ESG and HVAC policy database to find specific rules.
    Use this to verify if a user's AC request (temp, mode, time) is compliant.
    """
    try:
        embeddings, supabase = _build_clients()
        
        # Embed using Gemini (768)
        query_vector = await embeddings.aembed_query(query)

        # Call the updated Supabase RPC
        response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_vector,
                "match_count": 4
            }
        ).execute()

        docs = response.data

        if not docs:
            return "ERROR: No specific policy rules found for this query. DO NOT RETRY."

        formatted_results = []
        for index, doc in enumerate(docs, start=1):
            raw_text = doc.get("content") or doc.get("page_content") or ""
            clean_text = raw_text.replace("\n", " ").strip()
            formatted_results.append({
                "source": f"Rule Source {index}",
                "content": clean_text,
            })

        return json.dumps({
            "status": "success",
            "query": query,
            "results": formatted_results,
        })

    except Exception as e:
        return f"CRITICAL ERROR: {str(e)}"

# --- TEST ---
if __name__ == "__main__":
    async def run_test():
        print("🧪 Testing ESG Policy Search Tool...\n")
        test_query = "What is the minimum allowed temperature for an office?"
        result = await search_esg_policy_tool.ainvoke({"query": test_query})
        print(result)

    asyncio.run(run_test())