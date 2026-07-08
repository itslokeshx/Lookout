import re
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from langchain_core.tools import tool

from agent.config import BREVO_API_KEY
from agent.config_store import load_settings
from agent.db.client import get_users_collection

last_query_result = []


def clean_projection(proj: dict) -> dict:
    has_id = "_id" in proj
    id_val = proj.get("_id")
    fields = [k for k, v in proj.items() if k != "_id" and v == 1]
    # Sort by number of parts in dot notation (parents first)
    fields.sort(key=lambda x: len(x.split('.')))
    cleaned = {}
    for f in fields:
        parts = f.split('.')
        is_redundant = False
        for i in range(1, len(parts)):
            parent = ".".join(parts[:i])
            if parent in cleaned:
                is_redundant = True
                break
        if not is_redundant:
            cleaned[f] = 1
    if has_id:
        cleaned["_id"] = id_val
    return cleaned


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
    return clean_projection(projection)


import datetime

def _parse_dates(val):
    if isinstance(val, dict):
        return {k: _parse_dates(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [_parse_dates(x) for x in val]
    elif isinstance(val, str):
        s = val
        if s.endswith('Z'):
            s = s[:-1] + '+00:00'
        if len(s) >= 10 and s[4] == '-' and s[7] == '-' and s[:4].isdigit() and s[5:7].isdigit() and s[8:10].isdigit():
            try:
                return datetime.datetime.fromisoformat(s)
            except ValueError:
                try:
                    return datetime.datetime.strptime(s[:10], "%Y-%m-%d")
                except ValueError:
                    pass
    return val


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
        filters = _parse_dates(filters)
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
            elif isinstance(v, datetime.datetime):
                query[k] = v
            else:
                query[k] = v

    settings = load_settings()
    if settings.enrichment and settings.enrichment.collection:
        pipeline = []
        lookup_pipeline = [
            {"$match": {"$expr": {"$eq": [f"${settings.enrichment.foreign_key}", "$$local_val"]}}}
        ]
        if settings.enrichment.sort_field:
            sort_dir = -1 if not settings.enrichment.sort_ascending else 1
            lookup_pipeline.append({"$sort": {settings.enrichment.sort_field: sort_dir}})
        lookup_pipeline.append({"$limit": 1})

        pipeline.append({
            "$lookup": {
                "from": settings.enrichment.collection,
                "let": {"local_val": f"${settings.enrichment.local_key}"},
                "pipeline": lookup_pipeline,
                "as": "_enrichment_docs"
            }
        })
        pipeline.append({
            "$unwind": {
                "path": "$_enrichment_docs",
                "preserveNullAndEmptyArrays": True
            }
        })

        # Build a merge that prefixes conflicting enrichment fields
        # to avoid overwriting primary document fields (e.g. playlists.name vs users.name)
        enrichment_collection = settings.enrichment.collection
        pipeline.append({
            "$addFields": {
                "_enrichment_flat": {"$ifNull": ["$_enrichment_docs", {}]}
            }
        })
        # Get the enrichment fields that DON'T collide with root, plus prefixed versions
        # of ones that DO collide. We do this by merging root-first, then selectively
        # adding enrichment fields with a prefix for collisions.
        # Since we can't introspect field names at aggregation time, we merge root-first
        # (so root wins) and then add ALL enrichment fields with a prefix so they're
        # always accessible.
        pipeline.append({
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        {"$ifNull": ["$_enrichment_docs", {}]},
                        "$$ROOT",
                    ]
                }
            }
        })
        # Clean up temporary fields
        pipeline.append({
            "$unset": ["_enrichment_docs", "_enrichment_flat"]
        })
        if query:
            pipeline.append({"$match": query})
        if sort_by:
            pipeline.append({"$sort": {sort_by: -1 if not ascending else 1}})
        if projection:
            pipeline.append({"$project": projection})
        if limit is None or limit <= 0:
            limit = 10000
        pipeline.append({"$limit": limit})
        cursor = collection.aggregate(pipeline)
    else:
        cursor = collection.find(query, projection)
        if sort_by:
            cursor = cursor.sort(sort_by, -1 if not ascending else 1)
        if limit is None or limit <= 0:
            limit = 10000
        cursor = cursor.limit(limit)

    from agent.config_store import _serialize_doc
    global last_query_result
    serialized_users = [_serialize_doc(u) for u in cursor]
    last_query_result = serialized_users

    return f"Successfully found {len(serialized_users)} users matching the criteria."


def _send_email(receiver: str, subject: str, body: str) -> str:
    import time as _time

    settings = load_settings()
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = BREVO_API_KEY

    max_retries = 3
    for attempt in range(max_retries):
        try:
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                sender={"name": settings.sender_name, "email": settings.sender_email},
                to=[{"email": receiver}],
                subject=subject,
                html_content=body,
            )
            api_response = api_instance.send_transac_email(send_smtp_email)
            return f"Sent to {receiver} (id: {api_response.message_id})"
        except ApiException as e:
            return f"Failed: {e}"
        except Exception as e:
            if attempt < max_retries - 1:
                _time.sleep(1 * (attempt + 1))
                continue
            return f"Failed: Connection error after {max_retries} attempts: {e}"


@tool
def sendMail(receiver: str, subject: str, body: str) -> str:
    """Send an approved email using Brevo."""
    return _send_email(receiver, subject, body)
