import sys
import os
# This forces Python to look at the parent directory of this script's folder
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
from uuid import uuid4
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver

# Import the workflow directly from your supervisor file
from orchestrator.supervisor import workflow 

async def run_evaluation():
    print("🚀 Starting Multi-Agent Evaluation Suite...\n")
    
    # Use MemorySaver for clean, isolated evaluation runs
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)

    # 1. Define your test scenarios
    test_cases = [
        {
            "name": "1. Single Domain (Booking)",
            "prompt": "Can you book Huddle Room 1 for tomorrow at 3 PM?"
        },
        {
            "name": "2. Single Domain (HVAC)",
            "prompt": "It's way too hot in the Main Boardroom right now, can you lower the temp to 22 degrees?"
        },
        {
            "name": "3. Cross-Domain Routing (Booking + HVAC)",
            "prompt": "Cancel my booking for tomorrow at 3 PM. Also, the room I'm currently in (Huddle Room 2) is freezing, turn off the AC."
        }
    ]

    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"🧪 TEST CASE {i}: {test['name']}")
        print(f"👤 USER PROMPT: {test['prompt']}")
        print(f"{'='*70}\n")

        # Generate a unique thread ID for each test case to keep memory state isolated
        config = {"configurable": {"thread_id": f"eval-test-thread-{uuid4()}"}}
        
        # Initialize the state with the user's message
        initial_state = {"messages": [HumanMessage(content=test['prompt'])]}

        try:
            # 2. Stream the graph execution step-by-step
            async for event in app.astream(initial_state, config=config, stream_mode="updates"):
                
                # event.items() yields the name of the node that just finished, and the state it returned
                for node_name, state_update in event.items():
                    print(f"[NODE EXECUTED]: {node_name.upper()}")
                    
                    # --- TRACK ROUTING DECISIONS ---
                    if "next" in state_update:
                        decision = state_update["next"]
                        print(f"  🔀 ROUTING DECISION -> {decision}")
                    
                    # --- TRACK MESSAGES AND TOOL CALLS ---
                    if "messages" in state_update:
                        for msg in state_update["messages"]:
                            
                            # Catch Supervisor Commands
                            if isinstance(msg, SystemMessage) and msg.name == "Supervisor":
                                print(f"  🎯 SUPERVISOR COMMAND:\n     {msg.content}")

                            # Catch Agent Responses and Tool Calls
                            elif isinstance(msg, AIMessage):
                                agent_name = msg.name or "Unknown_Agent"
                                
                                # Print Tool Calls
                                if getattr(msg, "tool_calls", None):
                                    for tool in msg.tool_calls:
                                        print(f"  🛠️  TOOL CALL [{agent_name}]: {tool['name']}")
                                        print(f"     Args: {tool['args']}")
                                
                                # Print textual responses/reports
                                elif msg.content:
                                    content_str = str(msg.content).strip()
                                    # Truncate extremely long JSON reports for terminal readability
                                    if len(content_str) > 300:
                                        content_str = content_str[:300] + " ... [TRUNCATED]"
                                        
                                    print(f"  💬 MESSAGE FROM [{agent_name}]:\n     {content_str}")

                    print(f"{'-' * 50}")

        except Exception as e:
            print(f"❌ ERROR DURING EXECUTION: {e}")

        print(f"\n✅ TEST CASE {i} COMPLETE")
        await asyncio.sleep(1) # Small pause before the next test

if __name__ == "__main__":
    asyncio.run(run_evaluation())