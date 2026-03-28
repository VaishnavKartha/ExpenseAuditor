from datetime import datetime, timezone
import os
import shutil
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
from config import claims_collection, notifications_collection
from models import Override
from utils.auth import get_current_user
from utils.ocr import extract

router = APIRouter(prefix="/claims", tags=["Claims"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_json_safe(doc: dict) -> dict:
    """Convert ObjectId and datetime → strings so FastAPI can serialize them."""
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = _to_json_safe(value)
        elif isinstance(value, list):
            result[key] = [
                _to_json_safe(i) if isinstance(i, dict) else i
                for i in value
            ]
        else:
            result[key] = value
    return result


async def _create_notification(user_id: str, claim_id: str, status_val: str):
    messages = {
        "approved": "Your expense claim has been approved.",
        "flagged":  "Your expense claim has been flagged for review.",
        "rejected": "Your expense claim has been rejected.",
        "override": "An auditor has overridden the decision on your claim.",
    }
    await notifications_collection.insert_one({
        "user_id":    user_id,
        "claim_id":   claim_id,
        "type":       status_val,
        "message":    messages.get(status_val, "Your claim status has been updated."),
        "is_read":    False,
        "created_at": datetime.now(timezone.utc),
    })


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_claim(
    description:      Optional[str]   = Form(None),
    business_purpose: Optional[str]   = Form(...),
    category:         Optional[str]   = Form(None),
    amount:           Optional[float] = Form(None),
    currency:         Optional[str]   = Form("GBP"),
    expense_date:     Optional[str]   = Form(None),
    file:             UploadFile      = File(...),
    current_user:     dict            = Depends(get_current_user),
):
    # ── Step 1: Save uploaded receipt file to disk ─────────────────────────────
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ── Step 2: Run Gemini OCR ─────────────────────────────────────────────────
    # Returns: {"vendor_name": ..., "total": ..., "currency": ..., "items": [...]}
    extracted = extract(file_path)
    print("OCR result:", extracted)


    if extracted["confidence"] != "high" :
        return JSONResponse(
        status_code=201,
        content={"message":"Image is blurry or corrupted, Please reupload a clear image or fill in the form"}


        
    )

    if extracted.get("total") is None and extracted.get("items"):
        extracted["total"] = sum(
        item["price"] * item.get("quantity", 1)
        for item in extracted["items"]
    )

    # ── Step 3: Build document ─────────────────────────────────────────────────
    # We store both what the employee submitted (amount, currency, expense_date)
    # AND what Gemini extracted from the receipt image (extracted_data).
    # If Gemini found a value the employee didn't type, both are stored —
    # the auditor can compare them in the detail view.
    now = datetime.now(timezone.utc)
    doc = {
        # Who submitted
        "employee_id":       current_user["_id"],

        # Receipt file
        "receipt_image_url": file_path,

        # What employee filled in the form
        "description":       description,
        "business_purpose":  business_purpose,
        "category":          category,
        "amount":            amount,
        "currency":          currency or extracted.get("currency"),
        "expense_date":      expense_date,

        # What Gemini extracted from the receipt image
        # Stored as a nested object — matches ExtractedData in your schema
        "extracted_data": {
            "vendor_name": extracted.get("vendor_name"),
            "total":       extracted.get("total"),
            "currency":    extracted.get("currency"),
            "date":        extracted.get("date"),
            "items":       extracted.get("items", []),
            "raw_text":    extracted.get("raw_text"),
        },

        # These are filled later by the audit pipeline
        "audit_result": None,
        "override":     None,
        "final_status": "pending",

        "created_at": now,
        "updated_at": now,
    }

    # ── Step 4: Insert into MongoDB ────────────────────────────────────────────
    result = await claims_collection.insert_one(doc)

    # ── Step 5: Return the saved document ─────────────────────────────────────
    # Attach the generated _id, convert to JSON-safe types, return
    doc["_id"] = result.inserted_id
    return JSONResponse(
        status_code=201,
        content=_to_json_safe(doc)
    )


@router.get("/")
async def list_claims(current_user: dict = Depends(get_current_user)):
    """
    Employees  → see only their own claims, sorted by newest first.
    Auditors   → see all claims, sorted by risk level (high risk first).
    """
    query      = {}
    sort_field = "created_at"

    if current_user["role"] == "employee":
        query["employee_id"] = current_user["_id"]
    else:
        sort_field = "audit_result.risk_level"

    cursor = claims_collection.find(query).sort(sort_field, -1)
    return [_to_json_safe(doc) async for doc in cursor]


@router.get("/{claim_id}")
async def get_claim(claim_id: str, current_user: dict = Depends(get_current_user)):
    """Get full detail of a single claim including extracted data and audit result."""
    doc = await claims_collection.find_one({"_id": ObjectId(claim_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Employees can only view their own claims
    if current_user["role"] == "employee" and doc["employee_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return JSONResponse(content=_to_json_safe(doc))


@router.put("/{claim_id}/override")
async def override_claim(
    claim_id:     str,
    override:     Override,
    current_user: dict = Depends(get_current_user),
):
    """Auditor overrides the AI verdict with a manual decision and comment."""
    if current_user["role"] != "auditor":
        raise HTTPException(status_code=403, detail="Only auditors can override claims")

    doc = await claims_collection.find_one({"_id": ObjectId(claim_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Claim not found")

    override_data = override.model_dump()
    override_data["auditor_id"]    = current_user["_id"]
    override_data["overridden_at"] = datetime.now(timezone.utc)

    await claims_collection.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {
            "override":     override_data,
            "final_status": override.new_status,
            "updated_at":   datetime.now(timezone.utc),
        }},
    )

    await _create_notification(doc["employee_id"], claim_id, "override")
    return {"message": "Claim overridden successfully"}