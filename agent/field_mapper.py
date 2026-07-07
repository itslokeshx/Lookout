from pydantic import BaseModel, Field
from langchain_groq import ChatGroq

from agent.config import GROQ_API_KEY


class FieldSuggestion(BaseModel):
    email_field: str = Field(description="Field name most likely containing user email addresses")
    name_field: str = Field(description="Field name most likely containing user display names")
    joined_date_field: str = Field(default="", description="Field name for account creation / join date, empty string if none found")
    last_active_field: str = Field(default="", description="Field name for last activity timestamp, empty string if none found")


class MetricSuggestion(BaseModel):
    field: str = Field(description="The numeric field name")
    label: str = Field(description="A human-readable label for this metric")
    unit: str = Field(default="", description="Unit guess, e.g. 'seconds', 'count', 'dollars'")


class JoinSuggestion(BaseModel):
    local_key: str = Field(description="Field in the primary collection to join on")
    foreign_key: str = Field(description="Field in the secondary collection to join on")
    reason: str = Field(description="Short explanation of why these fields likely match")


class MappingSuggestion(BaseModel):
    fields: FieldSuggestion
    metrics: list[MetricSuggestion] = Field(default_factory=list)
    join: JoinSuggestion | None = None


def suggest_field_mapping(
    primary_sample: dict,
    secondary_sample: dict | None = None,
) -> MappingSuggestion:
    llm = ChatGroq(model="openai/gpt-oss-120b", api_key=GROQ_API_KEY)
    structured_llm = llm.with_structured_output(MappingSuggestion)

    primary_fields = _describe_fields(primary_sample)

    prompt_parts = [
        "Analyze this MongoDB document and suggest field mappings.",
        "",
        "Primary collection sample document fields:",
        primary_fields,
        "",
        "Identify:",
        "1. Which field contains email addresses",
        "2. Which field contains user display names",
        "3. Which field (if any) represents when the user joined / account was created",
        "4. Which field (if any) represents last activity",
        "5. Any numeric fields that could serve as engagement metrics (exclude _id and internal fields)",
    ]

    if secondary_sample:
        secondary_fields = _describe_fields(secondary_sample)
        prompt_parts.extend([
            "",
            "Secondary collection sample document fields:",
            secondary_fields,
            "",
            "6. Identify the most likely join key between the two collections and explain why.",
        ])

    return structured_llm.invoke("\n".join(prompt_parts))


def _describe_fields(doc: dict, prefix: str = "") -> str:
    lines = []
    for key, value in doc.items():
        full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        type_name = type(value).__name__
        sample = repr(value)
        if len(sample) > 80:
            sample = sample[:77] + "..."
        lines.append(f"  - {full_key}: {type_name} = {sample}")
    return "\n".join(lines)
