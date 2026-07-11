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
    import re

    settings = load_settings()
    product = settings.product_name or "LookOut"

    lines = draft.body.split("\n")
    body_parts = []
    bullet_buffer = []

    def flush_bullets():
        if not bullet_buffer:
            return
        items_html = ""
        for item in bullet_buffer:
            items_html += (
                '<tr><td valign="top" style="padding:0 10px 12px 0;width:24px;">'
                '<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a78bfa);margin-top:7px;"></div>'
                '</td>'
                '<td style="padding:0 0 12px;font-size:15px;line-height:1.6;color:#e2e8f0;">'
                f'{item}</td></tr>'
            )
        body_parts.append(
            '<table role="presentation" cellpadding="0" cellspacing="0" '
            'style="margin:8px 0 16px 4px;width:100%;">'
            f'{items_html}</table>'
        )
        bullet_buffer.clear()

    for raw_line in lines:
        stripped = raw_line.strip()

        link_match = re.search(r'\[([^\]]+)\]\((https?://[^)]+)\)', stripped)

        is_bullet = stripped.startswith("•") or stripped.startswith("- ") or stripped.startswith("* ")
        if is_bullet:
            text = re.sub(r'^[•\-\*]\s*', '', stripped)
            if link_match:
                text = re.sub(
                    r'\[([^\]]+)\]\((https?://[^)]+)\)',
                    r'<a href="\2" style="color:#a78bfa;text-decoration:underline;">\1</a>',
                    text
                )
            bullet_buffer.append(text)
            continue

        flush_bullets()

        if not stripped:
            body_parts.append('<div style="height:10px;"></div>')
            continue

        if link_match and stripped == link_match.group(0):
            link_text = link_match.group(1)
            link_url = link_match.group(2)
            body_parts.append(
                '<table role="presentation" cellpadding="0" cellspacing="0" '
                'style="margin:24px auto;"><tr><td align="center" '
                'style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);">'
                f'<a href="{link_url}" target="_blank" '
                'style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:700;'
                'color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">'
                f'{link_text}</a></td></tr></table>'
            )
            continue

        processed = stripped
        if link_match:
            processed = re.sub(
                r'\[([^\]]+)\]\((https?://[^)]+)\)',
                r'<a href="\2" style="color:#a78bfa;text-decoration:underline;font-weight:600;">\1</a>',
                processed
            )

        body_parts.append(
            f'<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#e2e8f0;">{processed}</p>'
        )

    flush_bullets()

    body_html = "\n".join(body_parts)

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{draft.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f14;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06);">

<tr>
<td style="padding:36px 44px 28px;background:linear-gradient(135deg,#18182a 0%,#1e1b3a 50%,#1a1632 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">{product}</span>
</td>
</tr></table>
</td>
</tr>

<tr>
<td style="padding:36px 44px 40px;background-color:#16161e;">
{body_html}
</td>
</tr>

<tr>
<td style="padding:24px 44px;background-color:#121218;border-top:1px solid rgba(255,255,255,0.05);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
You received this because you're a {product} member.
</p>
</td>
<td align="right" valign="middle">
<span style="font-size:11px;font-weight:600;color:#4b5563;letter-spacing:0.5px;text-transform:uppercase;">Powered by LookOut</span>
</td>
</tr></table>
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>"""
