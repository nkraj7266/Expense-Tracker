import json
from datetime import date
from typing import Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from config import get_settings
from models import Category, ParsedExpense, PaymentMethod, Source

settings = get_settings()

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


class LLMExpenseSchema(BaseModel):
    amount: float
    category: Category
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: str
    tags: list[str] = []
    notes: Optional[str] = None


CATEGORY_LIST = ", ".join(f'"{c.value}"' for c in Category)
PAYMENT_METHOD_LIST = ", ".join(f'"{p.value}"' for p in PaymentMethod)


def build_prompt(text: str, today: date, error_hint: Optional[str] = None) -> str:
    hint = ""
    if error_hint:
        hint = (
            f"\n\nYour previous output was invalid ({error_hint}). "
            "Return ONLY valid JSON matching the schema, with no extra commentary."
        )
    return f"""You extract structured expense data from a short, informal sentence describing a purchase or payment.

Today's date is {today.isoformat()} ({today.strftime("%A")}). Resolve any relative date reference
("today", "yesterday", "last Friday", "on the 3rd") into an absolute date in YYYY-MM-DD format,
relative to today's date. If no date is mentioned at all, use today's date.

Rules:
- "amount" is the numeric amount spent, with no currency symbol.
- "category" MUST be exactly one of: {CATEGORY_LIST}. If nothing fits well, use "Other".
- "payment_method" MUST be exactly one of: {PAYMENT_METHOD_LIST}, or null if not mentioned.
- "merchant" is the store/vendor/person name if mentioned, else null.
- "subcategory" is a short, more specific label if obvious (e.g. "Restaurant", "Ride-share"), else null.
- "tags" is a short list of relevant free-form keywords (e.g. ["team lunch"]), can be empty.
- "notes" is any extra context worth keeping that doesn't fit other fields, else null.

Example:
Input: "Spent 320 on lunch with team at Barbeque Nation, paid by credit card"
Output: {{"amount": 320, "category": "Food & Dining", "subcategory": "Restaurant", "merchant": "Barbeque Nation", "payment_method": "Credit Card", "date": "{today.isoformat()}", "tags": ["team lunch"], "notes": null}}

Now extract from this input:
"{text}"{hint}
"""


def _parse_date_safe(value: str, today: date) -> date:
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return today


async def parse_expense_text(text: str, source: Source = Source.TEXT) -> ParsedExpense:
    client = get_client()
    today = date.today()

    last_error: Optional[str] = None
    for attempt in range(2):
        prompt = build_prompt(text, today, error_hint=last_error)
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LLMExpenseSchema,
                    temperature=0.1,
                ),
            )
            raw = response.parsed
            if raw is None:
                raw = LLMExpenseSchema.model_validate_json(response.text)

            resolved_date = _parse_date_safe(raw.date, today)

            return ParsedExpense(
                raw_input=text,
                amount=raw.amount,
                currency="INR",
                category=raw.category,
                subcategory=raw.subcategory,
                merchant=raw.merchant,
                payment_method=raw.payment_method,
                date=resolved_date,
                tags=raw.tags,
                notes=raw.notes,
                source=source,
                llm_model=settings.gemini_model,
            )
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            continue

    raise ValueError(f"LLM failed to produce a valid expense after retries: {last_error}")
