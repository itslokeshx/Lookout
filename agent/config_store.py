from pydantic import BaseModel, Field
from pymongo import MongoClient

from agent.config import MONGODB_URI

CONFIG_COLLECTION = "_lookout_config"
CONFIG_DOC_ID = "lookout_settings"


class MetricField(BaseModel):
    field: str
    label: str
    unit: str = ""


class JoinConfig(BaseModel):
    collection: str
    local_key: str
    foreign_key: str
    relationship: str = "one-to-one"
    sort_field: str | None = None
    sort_ascending: bool = False
    reason: str = ""


class FieldMapping(BaseModel):
    email: str = ""
    name: str = ""
    joined_date: str = ""
    last_active: str = ""


class LookOutSettings(BaseModel):
    db_name: str = ""
    collection_name: str = ""
    field_mapping: FieldMapping = Field(default_factory=FieldMapping)
    metrics: list[MetricField] = Field(default_factory=list)
    extra_fields: list[str] = Field(default_factory=list)
    sender_name: str = ""
    sender_email: str = ""
    email_provider: str = "brevo"
    enrichment: JoinConfig | None = None
    product_name: str = ""
    setup_complete: bool = False


_client: MongoClient | None = None


def _get_config_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    settings = load_settings()
    db_name = settings.db_name if settings.db_name else "lookout"
    return _client[db_name][CONFIG_COLLECTION]


def _get_admin_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client


import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "settings.json")


def load_settings() -> LookOutSettings:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
            return LookOutSettings(**data)
        except Exception:
            pass

    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    try:
        for db_name in _client.list_database_names():
            if db_name in ("admin", "local", "config"):
                continue
            coll = _client[db_name][CONFIG_COLLECTION]
            doc = coll.find_one({"_id": CONFIG_DOC_ID})
            if doc:
                doc.pop("_id", None)
                # Cache it locally
                try:
                    with open(SETTINGS_FILE, "w") as f:
                        json.dump(doc, f, indent=2)
                except Exception:
                    pass
                return LookOutSettings(**doc)
    except Exception:
        pass

    return LookOutSettings()


def save_settings(settings: LookOutSettings):
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings.model_dump(), f, indent=2)
    except Exception:
        pass

    try:
        global _client
        if _client is None:
            _client = MongoClient(MONGODB_URI)

        db_name = settings.db_name if settings.db_name else "lookout"
        coll = _client[db_name][CONFIG_COLLECTION]
        data = settings.model_dump()
        data["_id"] = CONFIG_DOC_ID
        coll.replace_one({"_id": CONFIG_DOC_ID}, data, upsert=True)
    except Exception:
        pass


def list_databases() -> list[str]:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    return [
        name for name in _client.list_database_names()
        if name not in ("admin", "local", "config")
    ]


def list_collections(db_name: str) -> list[str]:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    return [
        name for name in _client[db_name].list_collection_names()
        if not name.startswith("_lookout")
    ]


def get_sample_document(db_name: str, collection_name: str) -> dict | None:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    doc = _client[db_name][collection_name].find_one()
    if doc:
        return _serialize_doc(doc)
    return None


def _serialize_doc(doc: dict) -> dict:
    from bson import ObjectId

    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = _serialize_doc(v)
        elif isinstance(v, list):
            result[k] = [
                _serialize_doc(i) if isinstance(i, dict)
                else str(i) if isinstance(i, ObjectId)
                else i
                for i in v
            ]
        else:
            result[k] = v
    return result


def check_join_relationship(
    db_name: str,
    primary_collection: str,
    secondary_collection: str,
    local_key: str,
    foreign_key: str,
) -> dict:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)

    primary = _client[db_name][primary_collection]
    secondary = _client[db_name][secondary_collection]

    sample = primary.find_one()
    if not sample or local_key not in sample:
        return {"relationship": "unknown", "match_count": 0}

    sample_value = sample[local_key]
    match_count = secondary.count_documents({foreign_key: sample_value})

    return {
        "relationship": "one-to-one" if match_count <= 1 else "one-to-many",
        "match_count": match_count,
        "sample_value": str(sample_value),
    }


HISTORY_COLLECTION = "_lookout_history"


def add_dispatch_history(doc: dict):
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    settings = load_settings()
    db_name = settings.db_name if settings.db_name else "lookout"
    coll = _client[db_name][HISTORY_COLLECTION]
    coll.insert_one(doc)


def load_dispatch_history() -> list[dict]:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    settings = load_settings()
    db_name = settings.db_name if settings.db_name else "lookout"
    coll = _client[db_name][HISTORY_COLLECTION]
    cursor = coll.find({}, {"_id": 0}).sort("timestamp", -1)
    return list(cursor)


def clear_dispatch_history():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    settings = load_settings()
    db_name = settings.db_name if settings.db_name else "lookout"
    coll = _client[db_name][HISTORY_COLLECTION]
    coll.delete_many({})
