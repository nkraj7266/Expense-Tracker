import datetime as dt
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError

from auth.dependencies import require_admin
from database import expenses_collection, login_events_collection, users_collection
from models_admin import (
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserStats,
    AdminUserUpdate,
)
from models_auth import AccessLevel, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])

STATS_WINDOW_DAYS = 30


def _object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")


def _list_item(doc: dict) -> AdminUserListItem:
    return AdminUserListItem(
        id=str(doc["_id"]),
        email=doc["email"],
        display_name=doc.get("display_name"),
        access_level=doc.get("access_level", AccessLevel.USER),
        is_active=doc.get("is_active", True),
        created_at=doc["created_at"],
        last_login_at=doc.get("last_login_at"),
    )


def _current_streak(active_dates: set[dt.date], today: dt.date) -> int:
    """Consecutive days up to today, allowing today itself to still be "in progress"."""
    cursor_date = today if today in active_dates else today - dt.timedelta(days=1)
    if cursor_date not in active_dates:
        return 0
    streak = 0
    while cursor_date in active_dates:
        streak += 1
        cursor_date -= dt.timedelta(days=1)
    return streak


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    q: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    admin: UserOut = Depends(require_admin),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"display_name": {"$regex": q, "$options": "i"}},
        ]

    total = await users_collection.count_documents(query)
    cursor = users_collection.find(query).sort("created_at", -1).skip(offset).limit(limit)
    docs = await cursor.to_list(length=limit)
    return AdminUserListResponse(users=[_list_item(d) for d in docs], total=total)


@router.get("/users/{user_id}", response_model=AdminUserStats)
async def get_user_stats(user_id: str, admin: UserOut = Depends(require_admin)):
    oid = _object_id(user_id)
    user_doc = await users_collection.find_one({"_id": oid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    user_id_str = str(user_doc["_id"])
    today = dt.datetime.utcnow().date()
    window_start = today - dt.timedelta(days=STATS_WINDOW_DAYS)

    # Usage-tracking stats only: project timestamps, never expense content
    # (amount/merchant/category/notes) - see ADMIN_PANEL_PLAN.md §3, §8.
    login_docs = await login_events_collection.find(
        {"user_id": user_id_str}, {"_id": 0, "occurred_at": 1}
    ).to_list(length=20000)
    login_dates = {d["occurred_at"].date() for d in login_docs}

    expense_docs = await expenses_collection.find(
        {"user_id": user_id_str}, {"_id": 0, "date": 1}
    ).to_list(length=20000)
    expense_dates = {d["date"].date() for d in expense_docs}

    return AdminUserStats(
        id=user_id_str,
        email=user_doc["email"],
        display_name=user_doc.get("display_name"),
        access_level=user_doc.get("access_level", AccessLevel.USER),
        is_active=user_doc.get("is_active", True),
        account_created_at=user_doc["created_at"],
        total_logins=len(login_docs),
        last_login_at=user_doc.get("last_login_at"),
        distinct_login_days_30d=len({d for d in login_dates if d >= window_start}),
        current_login_streak_days=_current_streak(login_dates, today),
        total_expenses_logged=len(expense_docs),
        last_expense_at=max(expense_dates, default=None),
        distinct_expense_days_30d=len({d for d in expense_dates if d >= window_start}),
    )


@router.patch("/users/{user_id}", response_model=AdminUserListItem)
async def update_user(user_id: str, payload: AdminUserUpdate, admin: UserOut = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = dt.datetime.utcnow()

    oid = _object_id(user_id)
    try:
        result = await users_collection.update_one({"_id": oid}, {"$set": updates})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    doc = await users_collection.find_one({"_id": oid})
    return _list_item(doc)
