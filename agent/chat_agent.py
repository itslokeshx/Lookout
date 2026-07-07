from langchain_groq import ChatGroq
from langchain.agents import create_agent

from agent.config import GROQ_API_KEY
from agent.config_store import load_settings
from agent.chat_tools import (
    chat_find_users,
    count_users,
    aggregate_stat,
    count_secondary_documents,
    find_secondary_documents,
)


CHAT_TOOLS = [
    chat_find_users,
    count_users,
    aggregate_stat,
    count_secondary_documents,
    find_secondary_documents,
]


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
        if metric.field:
            unit_note = f" ({metric.unit})" if metric.unit else ""
            field_lines.append(f"* `{metric.field}` — {metric.label}{unit_note}")
    for extra in settings.extra_fields:
        if extra:
            field_lines.append(f"* `{extra}`")

    fields_block = "\n".join(field_lines) if field_lines else "* No fields configured yet."

    secondary_info = ""
    if settings.enrichment and settings.enrichment.collection:
        secondary_info = f"\nSecondary/Enrichment Collection: `{settings.enrichment.collection}` (linked to users via `{settings.enrichment.local_key}` -> `{settings.enrichment.foreign_key}`)\n"

    import datetime
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return f"""You are LookOut's data analyst for {product}.
Current time (UTC): {now_str}.
Use this current date/time to resolve relative date queries (e.g. "today", "yesterday", "last 24 hours", "this week").

You answer natural-language questions about the database. You have five tools:
* `chat_find_users` — find and list users matching filters (with joined secondary fields)
* `count_users` — count users matching filters
* `aggregate_stat` — compute avg/sum/min/max on a numeric field
* `count_secondary_documents` — count raw documents in the secondary/enrichment collection (e.g. messages, logs, orders)
* `find_secondary_documents` — find and list raw documents in the secondary/enrichment collection

Available database fields (for users):
{fields_block}
{secondary_info}

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
