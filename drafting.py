from models import EmailTemplate, EmailDraft
from agent import llm_gpt

template_llm = llm_gpt.with_structured_output(EmailTemplate)


def generate_template(matched_users: list, intent: str) -> EmailTemplate:
    available = list(matched_users[0].keys())
    prompt = f"""
Product: SoulSync
User intent: {intent}
Number of recipients: {len(matched_users)}
Sample recipients: {matched_users[:3]}

Available placeholders (use ONLY these, nothing else):
{chr(10).join(f'  - {{{k}}}' for k in available)}

Write ONE email template using only the placeholders listed above.
Sign off as "The SoulSync Team". Keep body under 100 words.
"""
    return template_llm.invoke(prompt)


class SafeDict(dict):
    """Returns '{key}' for any missing key instead of raising KeyError."""
    def __missing__(self, key):
        return f"{{{key}}}"


def renderTemplate(template: EmailTemplate, user: dict) -> EmailDraft:
    subject = template.subject_template.format_map(SafeDict(**user))
    body = template.body_template.format_map(SafeDict(**user))
    return EmailDraft(recipient=user["email"], subject=subject, body=body)
