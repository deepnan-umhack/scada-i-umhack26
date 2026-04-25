import sys
import os

# --- 🚀 FIX: Force Python to recognize the root 'agents' module ---
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import sys
import asyncio
import nest_asyncio

# 🚀 FIX: Force Python to use the standard event loop instead of uvloop
asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())

# NOW we can safely apply nest_asyncio
nest_asyncio.apply()

import streamlit as st
import uuid
from langchain_core.messages import HumanMessage

# Import your compiled LangGraph app AND the new database setup function
from supervisor import run_graph, setup_database

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="Facilities AI Orchestrator", page_icon="🏢", layout="centered")
st.title("🏢 Facilities Management AI")
st.caption("Powered by LangGraph & PostgreSQL Persistent Memory")

# --- POSTGRES INITIALIZATION ---
# This runs EXACTLY ONCE when the server starts to ensure your tables exist
@st.cache_resource
def init_database():
    try:
        print("⚙️ Initializing Postgres Tables...")
        asyncio.run(setup_database())
        return True
    except Exception as e:
        print(f"⚠️ DB Init Warning (Might already exist): {e}")
        return False

init_database()

# --- SESSION STATE (MEMORY) ---
if "thread_id" not in st.session_state:
    st.session_state.thread_id = "c84aa19b-7327-4550-8355-14fb4c2ba262"

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hello! I am your Facilities AI. My memory is now backed by PostgreSQL! How can I help you today?"}
    ]

# --- SIDEBAR CONFIGURATION ---
with st.sidebar:
    st.header("⚙️ User Settings")
    st.write("Simulate different users to test database validation.")
    
    user_id = st.text_input("Your User ID", value="scadai_user_001")
    
    st.divider()
    st.caption(f"**Active Memory Thread (Postgres Key):**\n`{st.session_state.thread_id}`")
    
    if st.button("🗑️ Clear Local UI Chat"):
        # We just hide the UI messages, but Postgres STILL has the memory!
        # To truly clear memory, we generate a new thread_id.
        st.session_state.thread_id = str(uuid.uuid4())
        st.session_state.messages = [st.session_state.messages[0]]
        st.rerun()

# --- ASYNC EXECUTION BRIDGE ---
# We wrap the invocation in a clean async function to protect the Postgres connection pool
async def run_orchestrator(user_text: str, u_id: str, t_id: str):
    backend_prompt = f"{user_text}\n[SYSTEM NOTE: The current user's ID is '{u_id}']"
    config = {"configurable": {"thread_id": t_id}}
    
    # 🚀 FIX 3: Call run_graph instead of app.ainvoke
    result = await run_graph(
        {"messages": [HumanMessage(content=backend_prompt)]}, 
        config=config
    )
    return result["messages"][-1].content

# --- CHAT UI ---
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# --- CHAT INPUT ---
if prompt := st.chat_input("E.g., Book a room for 5 people tomorrow..."):
    
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Accessing PostgreSQL Memory & Orchestrating..."):
            try:
                # Safely run the async graph
                final_reply = asyncio.run(
                    run_orchestrator(prompt, user_id, st.session_state.thread_id)
                )
                
                st.markdown(final_reply)
                st.session_state.messages.append({"role": "assistant", "content": final_reply})
                
            except Exception as e:
                error_msg = f"❌ System Error: {str(e)}"
                st.error(error_msg)
                st.session_state.messages.append({"role": "assistant", "content": error_msg})