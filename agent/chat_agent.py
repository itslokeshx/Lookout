from langchain_groq import ChatGroq
from langchain.agents import create_agent

from agent.config import GROQ_API_KEY
from agent.config_store import load_settings
from agent.chat_tools import chat_find_users, count_users, aggregate_stat


CHAT_TOOLS = [chat_find_users, count_users, aggregate_stat]


def _build_chat_system_prompt():
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
        unit_note = f" ({metric.unit})" if metric.unit else ""
        field_lines.append(f"* `{metric.field}` — {metric.label}{unit_note}")

    fields_block = "\n".join(field_lines) if field_lines else "* No fields configured yet."

    return f"""You are Lookout's data analyst for {product}.

You answer natural-language questions about the user database. You have three tools:
* `chat_find_users` — find and list users matching filters
* `count_users` — count users matching filters
* `aggregate_stat` — compute avg/sum/min/max on a numeric field

Available database fields:
{fields_block}

Rules:
* Use the tools to answer questions accurately.
* Never invent data — only report what the tools return.
* You CANNOT send emails, modify data, or perform any write operations.
* If someone asks you to send something, explain that sending happens in Mail mode and direct them there.
* Keep responses concise and data-focused.
* Format numbers and dates in a readable way."""


def build_chat_agent():
    llm = ChatGroq(model="openai/gpt-oss-120b", api_key=GROQ_API_KEY)
    return create_agent(
        model=llm,
        tools=CHAT_TOOLS,
        system_prompt=_build_chat_system_prompt(),
    )
