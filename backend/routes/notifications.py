from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from config import notifications_collection
from utils.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    cursor = notifications_collection.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1)

    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["_id"]},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}
