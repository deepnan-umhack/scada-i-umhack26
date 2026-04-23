import asyncio
import os
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv, find_dotenv
from esg_agent.esg_agent import run_esg_worker

async def run_test(test_name: str, prompt: str):
    print(f"\n{'='*60}")
    print(f"🛠️ TEST: {test_name}")
    print(f"📥 PROMPT: {prompt}")
    print(f"{'-'*60}")
    
    messages = [HumanMessage(content=prompt)]
    
    try:
        # Invoke the ESG worker
        final_message = await run_esg_worker(messages)
        
        print("\n📤 FINAL OUTPUT:")
        # We expect the output to start with [REPORT]: based on the prompts.py instructions
        print(final_message.content)
        
    except Exception as e:
        print(f"\n❌ ERROR OCCURRED: {e}")

async def main():
    load_dotenv(find_dotenv()) 
    
    # 🚨 DEBUG PRINT 🚨
    print(f"\n{'='*60}")
    print(f"🕵️ DEBUG: POSTGRES_URL loaded as:")
    print(f"👉 '{os.getenv('POSTGRES_URL')}'")
    print(f"{'='*60}\n")

    print("🚀 Starting ESG Agent Evaluation...")
    print("Testing tool execution and strict [REPORT]: output formatting.\n")
    
    # Test Case 1: Simple Utility Tool
    await run_test(
        "1. Calculate Carbon Offset Cost",
        "[SUPERVISOR COMMAND] Calculate the carbon offset cost for 2500 kg of emissions."
    )
    
    # Test Case 2: Social/Operational Analysis
    await run_test(
        "2. Analyze Space Utilization",
        "[SUPERVISOR COMMAND] Analyze space utilization for the period 2026-03-01T00:00:00Z to 2026-03-31T23:59:59Z."
    )
    
    # Test Case 3: Governance/Compliance Audit
    await run_test(
        "3. HVAC Compliance Audit",
        "[SUPERVISOR COMMAND] Run an HVAC compliance check between 2026-02-01T00:00:00Z and 2026-02-28T23:59:59Z."
    )

    # Test Case 4: Full Report Generation (Requires chaining tools)
    # The agent should realize it needs to fetch energy data FIRST, then generate the report.
    await run_test(
        "4. Full ESG Report Generation",
        "[SUPERVISOR COMMAND] Generate an ESG report for 2026-01-01T00:00:00Z to 2026-01-31T23:59:59Z requested by Admin123. Ensure you fetch the energy data first."
    )

if __name__ == "__main__":
    # Ensure this script is run from the 'agents' directory so dotenv loads correctly
    asyncio.run(main())