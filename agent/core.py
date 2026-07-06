import json

from langchain_groq import ChatGroq
from langchain.agents import create_agent
from langchain_core.messages import ToolMessage

from agent.config import GROQ_API_KEY
import agent.tools as tools_module
from agent.tools import find_users

def get_tool_result(agent_response):
    """Extract the matched users directly from the global cache to bypass LLM context limits."""
    users = tools_module.last_query_result
    tools_module.last_query_result = []  
    return users

llm_gpt = ChatGroq(model="openai/gpt-oss-120b", api_key=GROQ_API_KEY)

finder_agent = create_agent(
    model=llm_gpt,
    tools=[find_users],
    system_prompt="""
You are LookOut's user discovery agent.

Your job is to identify the correct SoulSync users by calling the `find_users` tool.

Available fields:
* `name`
* `email`
* `authProvider` (e.g. "google")
* `totalListeningTime` (seconds)
* `createdAt` (join date)
* `updatedAt` (last active)

Infer these arguments from the user's request:
* `filters`
* `sort_by`
* `ascending`
* `limit`

Intent examples:
* Top / most active → `sort_by="totalListeningTime"`, `ascending=False`
* Least active → `sort_by="totalListeningTime"`, `ascending=True`
* Newest → `sort_by="createdAt"`, `ascending=False`
* Oldest → `sort_by="createdAt"`, `ascending=True`
* Recently active → `sort_by="updatedAt"`, `ascending=False`
* Inactive → `sort_by="updatedAt"`, `ascending=True`

Rules:
* Always call `find_users`.
* Never invent users or fields.
* Combine filters and sorting when needed.
* If the request cannot be answered using the available fields, explain why.
""")
