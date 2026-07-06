from pymongo import MongoClient

from agent.config import MONGODB_URI, DB_NAME, COLLECTION_NAME

client = MongoClient(MONGODB_URI)
users_collection = client[DB_NAME][COLLECTION_NAME]
