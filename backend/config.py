import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_EXPIRE_MINUTES = 60*24
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = AsyncIOMotorClient(MONGO_URI)
db = client["Audit_db"]


users_collection = db["users"]
claims_collection = db["claims"]
policies_collection = db["policies"]
notifications_collection = db["notifications"]