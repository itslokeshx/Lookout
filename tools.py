import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from langchain_core.tools import tool

from config import BREVO_API_KEY, SENDER_NAME, SENDER_MAIL
from db import users_collection


@tool
def find_users(
    filters: dict = None,
    sort_by: str = None,
    ascending: bool = False,
    limit: int = 5,
):
    """
    Query SoulSync users with optional filters, sorting, and limit.

    Available fields:
    - name
    - email
    - totalListeningTime
    - updatedAt (last active)
    - createdAt (joined date)
    """

    query = filters or {}

    targeted_users = users_collection.find(
        query,
        {
            "_id": 0,
            "name": 1,
            "email": 1,
            "totalListeningTime": 1,
            "updatedAt": 1,
            "createdAt": 1,
        },
    )

    if sort_by:
        targeted_users = targeted_users.sort(
            sort_by,
            -1 if not ascending else 1,
        )

    targeted_users = targeted_users.limit(limit)

    def serialize(user):
        return {
            k: (v.isoformat() if hasattr(v, "isoformat") else v)
            for k, v in user.items()
        }

    return [serialize(u) for u in targeted_users]


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
