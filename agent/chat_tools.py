import re
from langchain_core.tools import tool

from agent.config_store import load_settings
from agent.db.client import get_users_collection


@tool
def chat_find_users(
    filters: dict | None = None,
    sort_by: str | None = None,
    ascending: bool | None = False,
    limit: int | None = 20,
) -> str:
    """
    Query users with optional filters, sorting, and limit.
    Returns the matching users as a formatted list for the chat response.
    """
    collection = get_users_collection()
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

    query = _build_query(filters)
    cursor = collection.find(query, projection)

    if sort_by:
        cursor = cursor.sort(sort_by, -1 if not ascending else 1)

    if limit is None or limit <= 0:
        limit = 50

    cursor = cursor.limit(limit)

    def serialize(user):
        return {
            k: (v.isoformat() if hasattr(v, "isoformat") else str(v) if hasattr(v, "binary") else v)
            for k, v in user.items()
        }

    users = [serialize(u) for u in cursor]
    if not users:
        return "No users found matching those criteria."

    return f"Found {len(users)} users:\n" + "\n".join(
        str(u) for u in users
    )


@tool
def count_users(filters: dict | None = None) -> str:
    """
    Count users matching the given filters.
    Returns the count as a string.
    """
    collection = get_users_collection()
    query = _build_query(filters)
    count = collection.count_documents(query)
    return f"{count} users match the given criteria."


@tool
def aggregate_stat(
    field: str,
    operation: str,
    filters: dict | None = None,
) -> str:
    """
    Compute a statistic (avg, sum, min, max) on a numeric field across matching users.
    `operation` must be one of: avg, sum, min, max.
    `field` is the database field name to aggregate.
    `filters` is an optional MongoDB filter dict.
    """
    collection = get_users_collection()
    valid_ops = {"avg": "$avg", "sum": "$sum", "min": "$min", "max": "$max"}
    if operation.lower() not in valid_ops:
        return f"Invalid operation '{operation}'. Must be one of: avg, sum, min, max."

    mongo_op = valid_ops[operation.lower()]
    pipeline = []

    if filters:
        pipeline.append({"$match": _build_query(filters)})

    pipeline.append({
        "$group": {
            "_id": None,
            "result": {mongo_op: f"${field}"},
            "count": {"$sum": 1},
        }
    })

    results = list(collection.aggregate(pipeline))
    if not results or results[0]["count"] == 0:
        return f"No data found for field '{field}' with the given filters."

    value = results[0]["result"]
    count = results[0]["count"]

    if isinstance(value, float):
        value = round(value, 2)

    return f"The {operation} of '{field}' across {count} users is {value}."


def _build_query(filters: dict | None) -> dict:
    if not filters:
        return {}

    query = {}
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
    return query
