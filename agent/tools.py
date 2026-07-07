import re
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from langchain_core.tools import tool

from agent.config import BREVO_API_KEY
from agent.config_store import load_settings
from agent.db.client import get_users_collection

last_query_result = []


def _build_projection():
    settings = load_settings()
    mapping = settings.field_mapping
    projection = {"_id": 0}
    if mapping.email:
        projection[mapping.email] = 1
    if mapping.name:
        projection[mapping.name] = 1
    if mapping.joined_date:
        projection[mapping.joined_date] = 1
    if mapping.last_active:
        projection[mapping.last_active] = 1
    for metric in settings.metrics:
        if metric.field:
            projection[metric.field] = 1
    for extra in settings.extra_fields:
        if extra:
            projection[extra] = 1
    return projection


@tool
def find_users(
    filters: dict | None = None,
    sort_by: str | None = None,
    ascending: bool | None = False,
    limit: int | None = 200,
):
    """
    Query users with optional filters, sorting, and limit.
    Returns a summary string. The actual user data is stored in memory for the backend to retrieve.
    """
    collection = get_users_collection()
    projection = _build_projection()

    query = {}
    if filters:
        for k, v in filters.items():
            if isinstance(v, list):
                if all(isinstance(x, str) for x in v):
                    pattern = "|".join(re.escape(x) for x in v)
                    query[k] = re.compile(pattern, re.IGNORECASE)
                else:
                    query[k] = v
            elif isinstance(v, dict) and "$in" in v:
                in_list = v["$in"]
                if isinstance(in_list, list) and all(isinstance(x, str) for x in in_list):
                    pattern = "|".join(re.escape(x) for x in in_list)
                    query[k] = re.compile(pattern, re.IGNORECASE)
                else:
                    query[k] = v
            elif isinstance(v, str):
                query[k] = re.compile(re.escape(v), re.IGNORECASE)
            else:
                query[k] = v

    cursor = collection.find(query, projection)

    if sort_by:
        cursor = cursor.sort(sort_by, -1 if not ascending else 1)

    if limit is None or limit <= 0:
        limit = 10000

    cursor = cursor.limit(limit)

    def serialize(user):
        return {
            k: (v.isoformat() if hasattr(v, "isoformat") else str(v) if hasattr(v, "binary") else v)
            for k, v in user.items()
        }

    global last_query_result
    serialized_users = [serialize(u) for u in cursor]
    last_query_result = serialized_users

    return f"Successfully found {len(serialized_users)} users matching the criteria."


def _send_email(receiver: str, subject: str, body: str) -> str:
    settings = load_settings()
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        sender={"name": settings.sender_name, "email": settings.sender_email},
        to=[{"email": receiver}],
        subject=subject,
        html_content=body,
    )
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return f"Sent to {receiver} (id: {api_response.message_id})"
    except ApiException as e:
        return f"Failed: {e}"


@tool
def sendMail(receiver: str, subject: str, body: str) -> str:
    """Send an approved email using Brevo."""
    return _send_email(receiver, subject, body)
