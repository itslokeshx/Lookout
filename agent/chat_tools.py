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
    for extra in settings.extra_fields:
        if extra:
            projection[extra] = 1

    query = _build_query(filters)
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
        pipeline.append({
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$$ROOT",
                        {"$ifNull": ["$_enrichment_docs", {}]}
                    ]
                }
            }
        })
        if query:
            pipeline.append({"$match": query})
        if sort_by:
            pipeline.append({"$sort": {sort_by: -1 if not ascending else 1}})
        if projection:
            pipeline.append({"$project": projection})
        if limit is None or limit <= 0:
            limit = 50
        pipeline.append({"$limit": limit})
        cursor = collection.aggregate(pipeline)
    else:
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
        pipeline.append({
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$$ROOT",
                        {"$ifNull": ["$_enrichment_docs", {}]}
                    ]
                }
            }
        })
        if query:
            pipeline.append({"$match": query})
        pipeline.append({"$count": "count"})
        results = list(collection.aggregate(pipeline))
        count = results[0]["count"] if results else 0
    else:
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
    settings = load_settings()
    pipeline = []

    if settings.enrichment and settings.enrichment.collection:
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
        pipeline.append({
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$$ROOT",
                        {"$ifNull": ["$_enrichment_docs", {}]}
                    ]
                }
            }
        })

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


import datetime

def _parse_dates(val):
    if isinstance(val, dict):
        return {k: _parse_dates(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [_parse_dates(x) for x in val]
    elif isinstance(val, str):
        # Try parsing as ISO format datetime
        s = val
        if s.endswith('Z'):
            s = s[:-1] + '+00:00'
        # Heuristic for YYYY-MM-DD or full ISO datetime string
        if len(s) >= 10 and s[4] == '-' and s[7] == '-' and s[:4].isdigit() and s[5:7].isdigit() and s[8:10].isdigit():
            try:
                return datetime.datetime.fromisoformat(s)
            except ValueError:
                try:
                    return datetime.datetime.strptime(s[:10], "%Y-%m-%d")
                except ValueError:
                    pass
    return val


def _build_query(filters: dict | None) -> dict:
    if not filters:
        return {}

    filters = _parse_dates(filters)
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
        elif isinstance(v, datetime.datetime):
            query[k] = v
        else:
            query[k] = v
    return query


@tool
def count_secondary_documents(filters: dict | None = None) -> str:
    """
    Count documents in the secondary/enrichment collection (e.g. messages, logs, etc.) if configured.
    """
    settings = load_settings()
    if not settings.enrichment or not settings.enrichment.collection:
        return "No secondary collection is configured."

    db = get_users_collection().database
    collection = db[settings.enrichment.collection]
    query = _build_query(filters)
    count = collection.count_documents(query)
    return f"There are {count} documents in the secondary collection '{settings.enrichment.collection}'."


@tool
def find_secondary_documents(
    filters: dict | None = None,
    sort_by: str | None = None,
    ascending: bool | None = False,
    limit: int | None = 50,
) -> str:
    """
    Query documents in the secondary/enrichment collection (e.g. messages, logs, etc.) directly.
    """
    settings = load_settings()
    if not settings.enrichment or not settings.enrichment.collection:
        return "No secondary collection is configured."

    db = get_users_collection().database
    collection = db[settings.enrichment.collection]
    query = _build_query(filters)
    cursor = collection.find(query)

    if sort_by:
        cursor = cursor.sort(sort_by, -1 if not ascending else 1)

    if limit is None or limit <= 0:
        limit = 50
    cursor = cursor.limit(limit)

    def serialize(doc):
        return {
            k: (v.isoformat() if hasattr(v, "isoformat") else str(v) if hasattr(v, "binary") else v)
            for k, v in doc.items()
        }

    docs = [serialize(d) for d in cursor]
    if not docs:
        return f"No documents found in secondary collection '{settings.enrichment.collection}' matching those criteria."

    return f"Found {len(docs)} documents in '{settings.enrichment.collection}':\n" + "\n".join(
        str(d) for d in docs
    )
