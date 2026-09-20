from datetime import date, datetime
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile

from auth.dependencies import get_current_user
from database import expenses_collection
from llm import parse_expense_image_bytes, parse_expense_text
from models import Category, ExpenseCreate, ExpenseOut, ExpenseUpdate, ParseRequest, ParsedExpense
from models_auth import UserOut
from rate_limit import limiter

router = APIRouter(prefix="/expenses", tags=["expenses"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024


def _validate_image(image: UploadFile) -> None:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Image must be JPEG, PNG, or WEBP")
    if image.size is not None and image.size > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be smaller than 8MB")


def _doc_to_out(doc: dict) -> ExpenseOut:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return ExpenseOut(**doc)


def _object_id(expense_id: str) -> ObjectId:
    try:
        return ObjectId(expense_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid expense id")


@router.post("/parse", response_model=ParsedExpense)
async def parse_expense(payload: ParseRequest, user: UserOut = Depends(get_current_user)):
    try:
        return await parse_expense_text(payload.text, source=payload.source)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/parse-image", response_model=ParsedExpense)
@limiter.limit("20/hour")
async def parse_expense_image(
    request: Request,
    image: UploadFile = File(...),
    user: UserOut = Depends(get_current_user),
):
    _validate_image(image)
    data = await image.read()
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be smaller than 8MB")
    try:
        return await parse_expense_image_bytes(data, image.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(payload: ExpenseCreate, user: UserOut = Depends(get_current_user)):
    now = datetime.utcnow()
    doc = payload.model_dump()
    doc["date"] = datetime.combine(payload.date, datetime.min.time())
    doc["category"] = payload.category.value
    doc["payment_method"] = payload.payment_method.value if payload.payment_method else None
    doc["source"] = payload.source.value
    doc["user_id"] = user.id
    doc["created_at"] = now
    doc["updated_at"] = now
    result = await expenses_collection.insert_one(doc)
    created = await expenses_collection.find_one({"_id": result.inserted_id})
    return _doc_to_out(created)


@router.get("", response_model=list[ExpenseOut])
async def list_expenses(
    date_from: Optional[date] = Query(default=None, alias="from"),
    date_to: Optional[date] = Query(default=None, alias="to"),
    category: Optional[Category] = None,
    q: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0,
    user: UserOut = Depends(get_current_user),
):
    query: dict = {"user_id": user.id}
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = datetime.combine(date_from, datetime.min.time())
        if date_to:
            query["date"]["$lte"] = datetime.combine(date_to, datetime.max.time())
    if category:
        query["category"] = category.value
    if min_amount is not None or max_amount is not None:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount
    if q:
        query["$text"] = {"$search": q}

    cursor = expenses_collection.find(query).sort("date", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_doc_to_out(d) for d in docs]


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(expense_id: str, user: UserOut = Depends(get_current_user)):
    doc = await expenses_collection.find_one({"_id": _object_id(expense_id), "user_id": user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _doc_to_out(doc)


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(expense_id: str, payload: ExpenseUpdate, user: UserOut = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "date" in updates:
        updates["date"] = datetime.combine(updates["date"], datetime.min.time())
    if "category" in updates:
        updates["category"] = updates["category"].value
    if "payment_method" in updates:
        updates["payment_method"] = updates["payment_method"].value
    updates["updated_at"] = datetime.utcnow()

    oid = _object_id(expense_id)
    result = await expenses_collection.update_one(
        {"_id": oid, "user_id": user.id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    doc = await expenses_collection.find_one({"_id": oid})
    return _doc_to_out(doc)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: str, user: UserOut = Depends(get_current_user)):
    result = await expenses_collection.delete_one(
        {"_id": _object_id(expense_id), "user_id": user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
