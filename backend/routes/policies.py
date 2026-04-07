import os
import shutil
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import JSONResponse

from config import policies_collection
from models import PolicyCreate, PolicyOut, ExpenseCategory
from utils.auth import get_current_user
from utils.policy_extractor import extract_policies

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


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def batch_create_policies(
    policies: list[PolicyCreate],
    current_user: dict = Depends(get_current_user),
):
    """
    Batch-save policies (e.g. after auditor reviews AI-extracted policies).
    Accepts a list of PolicyCreate objects and inserts them all into the DB.
    """
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can manage policies")

    if not policies:
        raise HTTPException(status_code=400, detail="No policies provided")

    docs = []
    for policy in policies:
        doc = policy.model_dump()
        doc["embedding"] = None
        doc["updated_at"] = datetime.now(timezone.utc)
        docs.append(doc)

    result = await policies_collection.insert_many(docs)

    return {
        "message": f"Successfully created {len(result.inserted_ids)} policies",
        "count": len(result.inserted_ids),
        "ids": [str(id) for id in result.inserted_ids],
    }


@router.post("/upload")
async def upload_policy_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a policy document (PDF/image). AI extracts all policies
    and returns them for auditor review. Does NOT save to DB.
    """
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can upload policy documents")

    # Validate file type
    allowed_types = {
        "image/jpeg", "image/png", "image/webp",
        "application/pdf",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPG, PNG, WEBP, PDF"
        )

    # Save file to uploads/
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/policy_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract policies using Gemini
    policies = extract_policies(file_path)

    if not policies:
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Could not extract any policies from the document. Please ensure the document contains expense policy information and is clearly readable.",
                "policies": [],
            }
        )

    return JSONResponse(
        status_code=200,
        content={
            "message": f"Successfully extracted {len(policies)} policies from the document.",
            "policies": policies,
        }
    )


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


@router.put("/{policy_id}")
async def update_policy(
    policy_id: str,
    policy: PolicyCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can manage policies")

    existing = await policies_collection.find_one({"_id": ObjectId(policy_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Policy not found")

    update_data = policy.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)

    await policies_collection.update_one(
        {"_id": ObjectId(policy_id)},
        {"$set": update_data},
    )

    updated = await policies_collection.find_one({"_id": ObjectId(policy_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{policy_id}")
async def delete_policy(
    policy_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can manage policies")

    result = await policies_collection.delete_one({"_id": ObjectId(policy_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"message": "Policy deleted successfully"}
