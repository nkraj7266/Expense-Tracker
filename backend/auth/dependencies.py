import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request

from auth.security import ACCESS_COOKIE_NAME, decode_token
from database import users_collection
from models_auth import AccessLevel, UserOut

_UNAUTHORIZED = HTTPException(status_code=401, detail="Not authenticated")
_ADMIN_LEVELS = {AccessLevel.ADMIN}  # extend here (e.g. + AccessLevel.SUPERADMIN) as roles grow


def user_doc_to_out(doc: dict) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        email=doc["email"],
        display_name=doc.get("display_name"),
        access_level=doc.get("access_level", AccessLevel.USER),
        created_at=doc["created_at"],
    )


async def get_current_user(request: Request) -> UserOut:
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        raise _UNAUTHORIZED

    try:
        payload = decode_token(token, expected_type="access")
    except jwt.PyJWTError:
        raise _UNAUTHORIZED

    try:
        oid = ObjectId(payload["sub"])
    except (InvalidId, KeyError):
        raise _UNAUTHORIZED

    doc = await users_collection.find_one({"_id": oid})
    if not doc or not doc.get("is_active", True):
        raise _UNAUTHORIZED

    return user_doc_to_out(doc)


async def require_admin(user: UserOut = Depends(get_current_user)) -> UserOut:
    if user.access_level not in _ADMIN_LEVELS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
