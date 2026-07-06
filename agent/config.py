import os
from dotenv import load_dotenv

load_dotenv()

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")

DB_NAME = "soulsync"
COLLECTION_NAME = "users"
SENDER_NAME = "SoulSync"
SENDER_MAIL = "lokeshvijayraina@gmail.com"
