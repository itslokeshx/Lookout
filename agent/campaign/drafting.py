from agent.campaign.models import EmailTemplate, EmailDraft
from agent.core import llm_gpt
from agent.config_store import load_settings

template_llm = llm_gpt.with_structured_output(EmailTemplate)


def generate_template(matched_users: list, intent: str) -> EmailTemplate:
    settings = load_settings()
    product = settings.product_name or "the product"

    available = list(matched_users[0].keys())
    prompt = f"""
Product: {product}
User intent: {intent}
Number of recipients: {len(matched_users)}
Sample recipients: {matched_users[:3]}

Available placeholders (use ONLY these, nothing else):
{chr(10).join(f'  - {{{k}}}' for k in available)}

Write ONE email template using only the placeholders listed above.
Sign off as "The {product} Team". Keep body under 100 words.
Use at most 4 emojis total across subject and body.
You must also explain your reasoning for the template in the 'reason' field.
"""
    return template_llm.invoke(prompt)


class SafeDict(dict):
    """Returns '{key}' for any missing key instead of raising KeyError."""
    def __missing__(self, key):
        return f"{{{key}}}"


def renderTemplate(template: EmailTemplate, user: dict) -> EmailDraft:
    settings = load_settings()
    email_field = settings.field_mapping.email or "email"
    subject = template.subject_template.format_map(SafeDict(**user))
    body = template.body_template.format_map(SafeDict(**user))
    return EmailDraft(recipient=user.get(email_field, ""), subject=subject, body=body)


def to_html(draft: EmailDraft) -> str:
    settings = load_settings()
    product = settings.product_name or "LookOut"

    paragraphs = []
    for line in draft.body.split("\n"):
        stripped = line.strip()
        if stripped:
            paragraphs.append(
                f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">{stripped}</p>'
            )
        else:
            paragraphs.append('<div style="height:8px;"></div>')

    body_html = "\n".join(paragraphs)

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr>
<td style="padding:32px 40px 24px;border-bottom:1px solid #e5e7eb;">
<span style="font-size:20px;font-weight:700;color:#8b9cf7;">{product}</span>
</td>
</tr>

<tr>
<td style="padding:32px 40px;">
{body_html}
</td>
</tr>

<tr>
<td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;">
You received this because you're a {product} member.
</p>
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>"""
