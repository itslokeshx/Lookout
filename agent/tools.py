import json
import re
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from langchain_core.tools import tool

import threading

from agent.config import BREVO_API_KEY, SENDER_NAME, SENDER_MAIL
from agent.db.client import users_collection

query_cache = threading.local()


@tool
def find_users(
    filters: dict | None = None,
    sort_by: str | None = None,
    ascending: bool = False,
    limit: int = 1000,
):
    """
    Query SoulSync users with optional filters, sorting, and limit.

    Available fields:
    - name
    - email
    - authProvider
    - totalListeningTime
    - updatedAt (last active)
    - createdAt (joined date)
    """

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

    targeted_users = users_collection.find(
        query,
        {
            "_id": 0,
            "name": 1,
            "email": 1,
            "totalListeningTime": 1,
            "updatedAt": 1,
            "createdAt": 1,
            "authProvider": 1,
        },
    )

    if sort_by:
        targeted_users = targeted_users.sort(
            sort_by,
            -1 if not ascending else 1,
        )

    if limit is None or limit <= 0:
        limit = 10000
    
    targeted_users = targeted_users.limit(limit)

    def serialize(user):
        return {
            k: (v.isoformat() if hasattr(v, "isoformat") else v)
            for k, v in user.items()
        }

    serialized_users = [serialize(u) for u in targeted_users]
    query_cache.last_matched_users = serialized_users

    # Return a minimal summary to the LLM to prevent context overflow
    return f"Successfully found {len(serialized_users)} users matching the criteria."


@tool
def sendMail(receiver: str, subject: str, body: str) -> str:
    """Send an approved email using Brevo."""
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        sender={"name": SENDER_NAME, "email": SENDER_MAIL},
        to=[{"email": receiver}],
        subject=subject,
        html_content=body,
    )
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return f"Sent to {receiver} (id: {api_response.message_id})"
    except ApiException as e:
        return f"Failed: {e}"
