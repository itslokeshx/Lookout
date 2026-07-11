import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEYS = [
    os.getenv("GROQ_API_KEY"),
    os.getenv("GROQ_API_KEY_2"),
    os.getenv("GROQ_API_KEY_3"),
]
GROQ_API_KEYS = [k for k in GROQ_API_KEYS if k]
GROQ_API_KEY = GROQ_API_KEYS[0] if GROQ_API_KEYS else None
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
