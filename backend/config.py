import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://vaishnavkartha:vaishnav123@cluster0.y86c7d0.mongodb.net",
)
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 24 hours
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY","AIzaSyBB7tM2rTpDTGWgeLvOoWNsZERAYS-PwbE")

client = AsyncIOMotorClient(MONGO_URI)
db = client["Audit_db"]

# ── Collections ────────────────────────────────────────
users_collection = db["users"]
claims_collection = db["claims"]
policies_collection = db["policies"]
notifications_collection = db["notifications"]