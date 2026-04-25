import asyncio
import os
import json
from typing import Literal
from pydantic import BaseModel, Field

# 🚀 Turn on LangChain Debug Mode to intercept the network traffic
import langchain
langchain.debug = True 

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import PydanticOutputParser



# 1. Your exact schema from supervisor.py
class RouterSchema(BaseModel):
    next: Literal["BOOKING_NODE", "SYNTHESIZER"] = Field(
        ..., 
        description="The next agent to route to, or SYNTHESIZER if all tasks are done or if you need to reply to the user."
    )
    command: str = Field(
        ..., description="A specific, direct instruction telling the targeted worker exactly what to do or evaluate."
    )   

async def run_structured_inspection():
    print("==================================================")
    print("🔍 INSPECTING .with_structured_output() BEHAVIOR")
    print("==================================================")

    # 2. Setup GLM-5.1 using the OpenAI Wrapper
    glm_llm = ChatOpenAI(
        api_key='sk-3395ebb6c894e7c47d9c4c4e5c30766f46368f5fd946e964',
        base_url='https://api.ilmu.ai/v1',
        model="ilmu-glm-5.1",
        temperature=0,
        model_kwargs={
            "extra_body":{
                "thinking": {"type": "enabled"}
            }
        }
    )

    # 3. Setup the robust Output Parser
    parser = PydanticOutputParser(pydantic_object=RouterSchema)

    # 4. Use your REAL System Prompt, and inject the parser instructions at the very bottom!
    system_prompt = SystemMessage(content=(
        "You are the Lead Facilities Orchestrator. Your job is to manage a scheduling specialist to solve user requests. "
        "You do not execute tasks yourself; you delegate them by issuing specific commands to your worker and reviewing their internal reports.\n\n"
        
        "TEAM DIRECTORY:\n"
        "- BOOKING_NODE: Executes room reservations, checks room availability, and manages physical equipment inventory.\n\n"
        
        "ORCHESTRATION RULES (CRITICAL):\n"
        "1. LOGICAL DECOMPOSITION: If a user's request is complex, handle it logically. For example, command the worker to check room availability first before issuing a second command to actually create the booking.\n"
        "2. ISSUE EXPLICIT COMMANDS: Never just route to a node. You must provide a clear 'command' telling the worker exactly what you need them to do or evaluate based on the user's prompt.\n"
        "3. CONFLICT RESOLUTION: If you route to the worker and their internal report shows a failure (e.g., the room is already booked, or the equipment is out of stock), "
        "do NOT proceed. Route to SYNTHESIZER to inform the user of the blockage and ask how they want to proceed.\n"
        "4. THE FINISH LINE: Only route to SYNTHESIZER when the user's request has been successfully completed by the worker, or if a blockage requires user input.\n\n"
        
        "FORMATTING RULES (CRITICAL):\n"
        # 🪄 This magically injects the JSON rules!
        f"{parser.get_format_instructions()}" 
    ))

    # 5. Set up the test interaction
    messages = [
        system_prompt,
        # Test a complex request to see if it properly delegates to the BOOKING_NODE
        HumanMessage(content="I need a room for 5 people tomorrow at 3 PM. Can you check if Room A is free?")
    ]

    print("\n⏳ SENDING REAL-WORLD REQUEST TO GLM-5.1...\n")

    try:
        # Fire the standard text request
        raw_result = await glm_llm.ainvoke(messages)
        thoughts = raw_result.additional_kwargs.get("reasoning_content")
        
        if thoughts:
            print(thoughts)
        else:
            # 2. If it's not there, print the raw hidden dictionaries so you can hunt for it!
            print("Additional Kwargs:", json.dumps(raw_result.additional_kwargs, indent=2))
            print("Response Metadata:", json.dumps(raw_result.response_metadata, indent=2))
        # Force the parser to clean the markdown and build the dictionary
        final_json = parser.invoke(raw_result)
        
        print("\n==================================================")
        print("✅ SUCCESS! GLM FOLLOWED ALL RULES AND RETURNED VALID JSON:")
        print("==================================================")
        print(json.dumps(final_json.model_dump(), indent=2))
        
    except Exception as e:
        print("\n==================================================")
        print("❌ CRASH DETECTED")
        print("==================================================")
        print(f"Error Message:\n{str(e)}")
        if 'raw_result' in locals():
            print("\nRAW TEXT FROM GLM:\n", raw_result.content)

if __name__ == "__main__":
    asyncio.run(run_structured_inspection())
# import json
# import requests

# def run_raw_test():
#     print("==================================================")
#     print("📡 SENDING RAW HTTP REQUEST TO ILMU.AI")
#     print("==================================================")

#     url = "https://api.ilmu.ai/v1/chat/completions"
    
#     headers = {
#         "Authorization": "Bearer sk-3395ebb6c894e7c47d9c4c4e5c30766f46368f5fd946e964",
#         "Content-Type": "application/json"
#     }

#     # This is the exact payload you showed me from the documentation
#     payload = {
#         "model": "ilmu-glm-5.1",
#         "messages": [
#             {
#                 "role": "system", 
#                 "content": "You are a database router. Output JSON only."
#             },
#             {
#                 "role": "user", 
#                 "content": "Check if Room A is free tomorrow."
#             }
#         ],
#         "thinking": { "type": "enabled" } # Force the thinking engine
#     }

#     print("⏳ Waiting for server response...\n")
    
#     try:
#         response = requests.post(url, headers=headers, json=payload)
        
#         print("==================================================")
#         print("📥 RAW UNFILTERED SERVER RESPONSE:")
#         print("==================================================")
#         # This prints every single piece of data the server sent back
#         print(json.dumps(response.json(), indent=2))
        
#     except Exception as e:
#         print(f"Request failed: {e}")

# if __name__ == "__main__":
#     run_raw_test()