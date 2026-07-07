from pymongo import MongoClient

from agent.config import MONGODB_URI
from agent.config_store import load_settings

_client: MongoClient | None = None


def _get_client():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client


def get_users_collection():
    settings = load_settings()
    if not settings.db_name or not settings.collection_name:
        raise RuntimeError("LookOut is not configured. Complete setup first.")
    return _get_client()[settings.db_name][settings.collection_name]


def get_collection(db_name: str, collection_name: str):
    return _get_client()[db_name][collection_name]


users_collection = property(lambda self: get_users_collection())
