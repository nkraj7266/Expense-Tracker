import datetime as dt
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from models_auth import AccessLevel


class AdminUserListItem(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    access_level: AccessLevel
    is_active: bool
    created_at: dt.datetime
    last_login_at: Optional[dt.datetime] = None


class AdminUserListResponse(BaseModel):
    users: list[AdminUserListItem]
    total: int


class AdminUserStats(BaseModel):
    """Usage-tracking numbers only - never expense amounts/content, see ADMIN_PANEL_PLAN.md §3."""

    id: str
    email: str
    display_name: Optional[str] = None
    access_level: AccessLevel
    is_active: bool
    account_created_at: dt.datetime
    total_logins: int
    last_login_at: Optional[dt.datetime] = None
    distinct_login_days_30d: int
    current_login_streak_days: int
    total_expenses_logged: int
    last_expense_at: Optional[dt.date] = None
    distinct_expense_days_30d: int


class AdminUserUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: Optional[str]) -> Optional[str]:
        return v.lower() if v else v
