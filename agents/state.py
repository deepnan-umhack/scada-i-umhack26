from typing import Annotated, Sequence, TypedDict
import operator
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    # The 'operator.add' tells LangGraph to APPEND new messages 
    # to the list rather than overwriting the whole list.
    messages: Annotated[Sequence[BaseMessage], operator.add]
    
    # This field stores the Supervisor's decision on which agent to call next.
    next: str