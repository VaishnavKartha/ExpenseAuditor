from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from config import policies_collection
from models import PolicyCreate, PolicyOut, ExpenseCategory
from utils.auth import get_current_user

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.post("/", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
async def create_policy(policy: PolicyCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can manage policies")

    doc = policy.model_dump()
    doc["embedding"] = None
    doc["updated_at"] = datetime.now(timezone.utc)

    result = await policies_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/")
async def list_policies(
    category: ExpenseCategory | None = Query(None),
    region: str | None = Query(None),
):
    query = {}
    if category:
        query["category"] = category.value
    if region:
        query["region"] = region

    cursor = policies_collection.find(query)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


@router.get("/{policy_id}", response_model=PolicyOut)
async def get_policy(policy_id: str):
    doc = await policies_collection.find_one({"_id": ObjectId(policy_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Policy not found")
    doc["_id"] = str(doc["_id"])
    return doc
