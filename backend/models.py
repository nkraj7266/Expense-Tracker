import datetime as dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Category(str, Enum):
    FOOD_DINING = "Food & Dining"
    GROCERIES = "Groceries"
    TRANSPORTATION = "Transportation"
    SHOPPING = "Shopping"
    ENTERTAINMENT = "Entertainment"
    BILLS_UTILITIES = "Bills & Utilities"
    HEALTH_FITNESS = "Health & Fitness"
    TRAVEL = "Travel"
    EDUCATION = "Education"
    RENT_HOUSING = "Rent & Housing"
    PERSONAL_CARE = "Personal Care"
    OTHER = "Other"


class PaymentMethod(str, Enum):
    CASH = "Cash"
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD = "Debit Card"
    UPI = "UPI"
    NET_BANKING = "Net Banking"
    WALLET = "Wallet"
    OTHER = "Other"


class Source(str, Enum):
    VOICE = "voice"
    TEXT = "text"
    MANUAL = "manual"


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    source: Source = Source.TEXT


class ParsedExpense(BaseModel):
    """Draft returned from the LLM parse step - not yet persisted."""

    raw_input: str
    amount: float = Field(gt=0)
    currency: str = "INR"
    category: Category
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: dt.date
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    source: Source = Source.TEXT
    llm_model: Optional[str] = None
    llm_confidence: Optional[float] = None

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: float) -> float:
        return round(v, 2)


class ExpenseCreate(BaseModel):
    raw_input: Optional[str] = None
    amount: float = Field(gt=0)
    currency: str = "INR"
    category: Category
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: dt.date
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    source: Source = Source.MANUAL
    llm_model: Optional[str] = None
    llm_confidence: Optional[float] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    category: Optional[Category] = None
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: Optional[dt.date] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: str
    user_id: str
    raw_input: Optional[str] = None
    amount: float
    currency: str
    category: Category
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: dt.date
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    source: Source
    llm_model: Optional[str] = None
    llm_confidence: Optional[float] = None
    created_at: dt.datetime
    updated_at: dt.datetime


class CategoryOut(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
