from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from database import categories_collection
from models import CategoryCreate, CategoryOut
from models_auth import UserOut

router = APIRouter(prefix="/categories", tags=["categories"])


def _doc_to_out(doc: dict) -> CategoryOut:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return CategoryOut(**doc)


@router.get("", response_model=list[CategoryOut])
async def list_categories():
    docs = await categories_collection.find().sort("name", 1).to_list(length=200)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(payload: CategoryCreate, user: UserOut = Depends(get_current_user)):
    existing = await categories_collection.find_one({"name": payload.name})
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    result = await categories_collection.insert_one(payload.model_dump())
    doc = await categories_collection.find_one({"_id": result.inserted_id})
    return _doc_to_out(doc)
