import datetime as dt

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pymongo.errors import DuplicateKeyError

from auth.dependencies import get_current_user, user_doc_to_out
from auth.security import (
    REFRESH_COOKIE_NAME,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    set_auth_cookies,
    verify_password,
)
from config import get_settings
from database import refresh_tokens_collection, users_collection
from models_auth import UserCreate, UserLogin, UserOut
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

_INVALID_CREDENTIALS = HTTPException(status_code=401, detail="Invalid email or password")
_INVALID_REFRESH = HTTPException(status_code=401, detail="Invalid or expired session")


async def _issue_session(response: Response, user_id: str) -> None:
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    now = dt.datetime.utcnow()
    await refresh_tokens_collection.insert_one(
        {
            "user_id": user_id,
            "token_hash": hash_token(refresh_token),
            "issued_at": now,
            "expires_at": now + dt.timedelta(days=settings.jwt_refresh_token_expires_days),
            "revoked_at": None,
            "replaced_by": None,
        }
    )
    set_auth_cookies(response, access_token, refresh_token)


@router.post("/signup", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
async def signup(request: Request, response: Response, payload: UserCreate):
    now = dt.datetime.utcnow()
    doc = {
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "display_name": payload.display_name,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    try:
        result = await users_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = str(result.inserted_id)
    await _issue_session(response, user_id)
    doc["_id"] = result.inserted_id
    return user_doc_to_out(doc)


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, payload: UserLogin):
    doc = await users_collection.find_one({"email": payload.email})
    if not doc or not verify_password(payload.password, doc["password_hash"]):
        raise _INVALID_CREDENTIALS
    if not doc.get("is_active", True):
        raise _INVALID_CREDENTIALS

    now = dt.datetime.utcnow()
    await users_collection.update_one({"_id": doc["_id"]}, {"$set": {"last_login_at": now}})

    await _issue_session(response, str(doc["_id"]))
    return user_doc_to_out(doc)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if token:
        await refresh_tokens_collection.update_one(
            {"token_hash": hash_token(token), "revoked_at": None},
            {"$set": {"revoked_at": dt.datetime.utcnow()}},
        )
    clear_auth_cookies(response)


@router.post("/refresh", response_model=UserOut)
async def refresh(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise _INVALID_REFRESH

    try:
        payload = decode_token(token, expected_type="refresh")
    except jwt.PyJWTError:
        raise _INVALID_REFRESH

    token_hash = hash_token(token)
    stored = await refresh_tokens_collection.find_one({"token_hash": token_hash})
    if not stored:
        raise _INVALID_REFRESH

    now = dt.datetime.utcnow()
    if stored["revoked_at"] is not None:
        if stored["replaced_by"] is not None:
            # A rotated-out token was reused: treat as theft and kill the whole session chain.
            await refresh_tokens_collection.update_many(
                {"user_id": stored["user_id"], "revoked_at": None},
                {"$set": {"revoked_at": now}},
            )
        clear_auth_cookies(response)
        raise _INVALID_REFRESH

    if stored["expires_at"] < now:
        raise _INVALID_REFRESH

    try:
        oid = ObjectId(stored["user_id"])
    except InvalidId:
        raise _INVALID_REFRESH

    user_doc = await users_collection.find_one({"_id": oid})
    if not user_doc or not user_doc.get("is_active", True):
        raise _INVALID_REFRESH

    new_access_token = create_access_token(stored["user_id"])
    new_refresh_token = create_refresh_token(stored["user_id"])
    new_doc = {
        "user_id": stored["user_id"],
        "token_hash": hash_token(new_refresh_token),
        "issued_at": now,
        "expires_at": now + dt.timedelta(days=settings.jwt_refresh_token_expires_days),
        "revoked_at": None,
        "replaced_by": None,
    }
    insert_result = await refresh_tokens_collection.insert_one(new_doc)
    await refresh_tokens_collection.update_one(
        {"_id": stored["_id"]},
        {"$set": {"revoked_at": now, "replaced_by": insert_result.inserted_id}},
    )

    set_auth_cookies(response, new_access_token, new_refresh_token)
    return user_doc_to_out(user_doc)


@router.get("/me", response_model=UserOut)
async def me(user: UserOut = Depends(get_current_user)):
    return user
