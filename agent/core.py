from agent.llm import ChatGroq
from langchain.agents import create_agent

from agent.config import GROQ_API_KEY
from agent.config_store import load_settings
from agent.tools import find_users
import agent.tools as tools_module


def get_tool_result(agent_response):
    users = tools_module.last_query_result
    tools_module.last_query_result = []
    return users


def _build_system_prompt():
    settings = load_settings()
    mapping = settings.field_mapping
    product = settings.product_name or "the product"

    field_lines = []
    if mapping.name:
        field_lines.append(f"* `{mapping.name}` (user name)")
    if mapping.email:
        field_lines.append(f"* `{mapping.email}` (email)")
    if mapping.joined_date:
        field_lines.append(f"* `{mapping.joined_date}` (join date)")
    if mapping.last_active:
        field_lines.append(f"* `{mapping.last_active}` (last active)")
    for metric in settings.metrics:
        if metric.field:
            unit_note = f" ({metric.unit})" if metric.unit else ""
            field_lines.append(f"* `{metric.field}` — {metric.label}{unit_note}")
    for extra in settings.extra_fields:
        if extra:
            field_lines.append(f"* `{extra}`")

    fields_block = "\n".join(field_lines) if field_lines else "* No fields configured yet."

    import datetime
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return f"""You are LookOut's user discovery agent for {product}.
Current time (UTC): {now_str}.
Use this current date/time to resolve relative date queries (e.g. "today", "yesterday", "last 24 hours", "this week").

Your job is to identify the correct users by calling the `find_users` tool.

Available fields:
{fields_block}

Infer these arguments from the user's request:
* `filters`
* `sort_by`
* `ascending`
* `limit` (Leave this completely empty if the user asks for "all users". Only set a number if they specifically ask for "top N" or a specific count.)

Rules:
* Always call `find_users`.
* Never invent users or fields.
* Combine filters and sorting when needed.
* If the request cannot be answered using the available fields, explain why."""


def build_finder_agent():
    llm = ChatGroq(model="openai/gpt-oss-120b", api_key=GROQ_API_KEY)
    return create_agent(
        model=llm,
        tools=[find_users],
        system_prompt=_build_system_prompt(),
    )


llm_gpt = ChatGroq(model="openai/gpt-oss-120b", api_key=GROQ_API_KEY)

finder_agent = build_finder_agent()
