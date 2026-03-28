from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from config import users_collection
from models import UserCreate, UserOut
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    # Check for duplicate email
    if await users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = user.model_dump()
    doc["password"] = hash_password(doc["password"])
    doc["created_at"] = datetime.now(timezone.utc)

    result = await users_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    del doc["password"]
    return doc


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"email": form_data.username})

    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"]
    })

    print("Login Successful")
    return {"access_token": token, "token_type": "bearer"}
