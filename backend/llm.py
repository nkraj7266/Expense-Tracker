import json
from datetime import date
from typing import Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from config import get_settings
from models import Category, ParsedExpense, PaymentMethod, Source

settings = get_settings()

MAX_BATCH_ITEMS = 20

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


class LLMExpenseListSchema(BaseModel):
    items: list[LLMExpenseSchema] = []


class LLMImageItemSchema(BaseModel):
    amount: float
    category: Category
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    date: Optional[str] = None
    tags: list[str] = []
    notes: Optional[str] = None


class LLMImageExpenseListSchema(BaseModel):
    found: bool
    items: list[LLMImageItemSchema] = []


CATEGORY_LIST = ", ".join(f'"{c.value}"' for c in Category)
PAYMENT_METHOD_LIST = ", ".join(f'"{p.value}"' for p in PaymentMethod)


def build_prompt(text: str, today: date, error_hint: Optional[str] = None) -> str:
    hint = ""
    if error_hint:
        hint = (
            f"\n\nYour previous output was invalid ({error_hint}). "
            "Return ONLY valid JSON matching the schema, with no extra commentary."
        )
    return f"""You extract structured expense data from a short, informal sentence describing one
or more purchases or payments.

Today's date is {today.isoformat()} ({today.strftime("%A")}). Resolve any relative date reference
("today", "yesterday", "last Friday", "on the 3rd") into an absolute date in YYYY-MM-DD format,
relative to today's date. If no date is mentioned at all, use today's date.

The input usually describes a SINGLE expense - return one entry in "items" for it. Only split
into multiple entries when the input clearly lists more than one separate purchase, each with
its own amount (e.g. joined by "and", commas, or newlines: "Uber 200 to office, lunch 350 at
Swiggy, coffee 120"). Do NOT split a single expense just because its description happens to
contain a comma (e.g. "Paid 500 for groceries, cash" is ONE expense, not two).

For each item:
- "amount" is the numeric amount spent, with no currency symbol.
- "category" MUST be exactly one of: {CATEGORY_LIST}. If nothing fits well, use "Other".
- "payment_method" MUST be exactly one of: {PAYMENT_METHOD_LIST}, or null if not mentioned.
- "merchant" is the store/vendor/person name if mentioned, else null.
- "subcategory" is a short, more specific label if obvious (e.g. "Restaurant", "Ride-share"), else null.
- "tags" is a short list of relevant free-form keywords (e.g. ["team lunch"]), can be empty.
- "notes" is any extra context worth keeping that doesn't fit other fields, else null.

Example (single expense):
Input: "Spent 320 on lunch with team at Barbeque Nation, paid by credit card"
Output: {{"items": [{{"amount": 320, "category": "Food & Dining", "subcategory": "Restaurant", "merchant": "Barbeque Nation", "payment_method": "Credit Card", "date": "{today.isoformat()}", "tags": ["team lunch"], "notes": null}}]}}

Example (multiple expenses):
Input: "Uber 200 to office, lunch 350 at Swiggy, coffee 120"
Output: {{"items": [{{"amount": 200, "category": "Transportation", "subcategory": "Ride-share", "merchant": "Uber", "payment_method": null, "date": "{today.isoformat()}", "tags": [], "notes": null}}, {{"amount": 350, "category": "Food & Dining", "subcategory": null, "merchant": "Swiggy", "payment_method": null, "date": "{today.isoformat()}", "tags": [], "notes": null}}, {{"amount": 120, "category": "Food & Dining", "subcategory": null, "merchant": null, "payment_method": null, "date": "{today.isoformat()}", "tags": [], "notes": null}}]}}

Now extract from this input:
"{text}"{hint}
"""


def build_image_prompt(today: date, note: Optional[str] = None, error_hint: Optional[str] = None) -> str:
    hint = ""
    if error_hint:
        hint = (
            f"\n\nYour previous output was invalid ({error_hint}). "
            "Return ONLY valid JSON matching the schema, with no extra commentary."
        )
    note_section = ""
    if note:
        note_section = f"""

The user also attached this note along with the screenshot - it may contain instructions
that aren't visible in the image itself, such as their share of a split bill, which
transaction to use if the screenshot shows several, a correction to the category/merchant,
or extra context. Apply it where relevant; if it only applies to one of several visible
transactions, apply it to that one only:
"{note}"
"""
    return f"""You extract structured expense data from a screenshot of a payment app -
a payment completion/success screen, or a payment history/transactions list. Common apps
include Swiggy, Zomato, Blinkit, Rapido, Uber, Ola, PhonePe, Google Pay, Paytm, and similar
UPI/food-delivery/ride-hailing apps, but the image may be from any payment app.

Today's date is {today.isoformat()} ({today.strftime("%A")}). Resolve any relative or
partial date/time shown in the screenshot ("Today, 3:45 PM", "Yesterday") into an absolute
date in YYYY-MM-DD format, relative to today's date. If no date is visible for an item, use
today's date.

First decide if this image actually shows at least one payment/transaction (an amount and a
merchant/payee are both visible). If not - e.g. it's unrelated, blank, unreadable, or a
non-payment screenshot - set "found" to false and return an empty "items" list.

If it does show one or more payments, set "found" to true and return one entry in "items" per
DISTINCT transaction visible. A single payment completion screen has exactly one. A payment
history/transactions list screen may have several - extract every distinct row you can read
(if more than {MAX_BATCH_ITEMS} are visible, return only the first {MAX_BATCH_ITEMS}). Never
merge or sum multiple transactions into one entry.

For each item:
- "amount": the numeric transaction amount, no currency symbol.
- "category" MUST be exactly one of: {CATEGORY_LIST}. Infer it from the app/merchant
  (e.g. Swiggy/Zomato/Blinkit -> "Food & Dining" or "Groceries" as fits; Rapido/Uber/Ola
  -> "Transportation"). If nothing fits well, use "Other".
- "payment_method" MUST be exactly one of: {PAYMENT_METHOD_LIST}, or null if not shown.
- "merchant" is the app name or payee/vendor shown (e.g. "Swiggy", "Blinkit", or a UPI
  payee name), else null.
- "subcategory" is a short, more specific label if obvious (e.g. "Food delivery",
  "Ride-share"), else null.
- "tags" is a short list of relevant free-form keywords, can be empty.
- "notes" can hold a visible transaction ID/UTR reference, else null.
{note_section}
Return ONLY the JSON object matching the schema, no extra commentary.{hint}
"""


def _parse_date_safe(value: Optional[str], today: date) -> date:
    if not value:
        return today
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return today


async def parse_expense_text(text: str, source: Source = Source.TEXT) -> list[ParsedExpense]:
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
                    response_schema=LLMExpenseListSchema,
                    temperature=0.1,
                ),
            )
            raw = response.parsed
            if raw is None:
                raw = LLMExpenseListSchema.model_validate_json(response.text)

            if not raw.items:
                raise ValueError("Could not extract any expense from this input")

            return [
                ParsedExpense(
                    raw_input=text,
                    amount=item.amount,
                    currency="INR",
                    category=item.category,
                    subcategory=item.subcategory,
                    merchant=item.merchant,
                    payment_method=item.payment_method,
                    date=_parse_date_safe(item.date, today),
                    tags=item.tags,
                    notes=item.notes,
                    source=source,
                    llm_model=settings.gemini_model,
                )
                for item in raw.items[:MAX_BATCH_ITEMS]
            ]
        except ValueError as exc:
            if str(exc) == "Could not extract any expense from this input":
                raise
            last_error = str(exc)
            continue
        except (ValidationError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            continue

    raise ValueError(f"LLM failed to produce a valid expense after retries: {last_error}")


async def parse_expense_image_bytes(
    data: bytes, mime_type: str, note: Optional[str] = None
) -> list[ParsedExpense]:
    client = get_client()
    today = date.today()
    raw_input = f"[screenshot upload] {note}" if note else "[screenshot upload]"

    last_error: Optional[str] = None
    for attempt in range(2):
        prompt = build_image_prompt(today, note=note, error_hint=last_error)
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=[
                    types.Part.from_bytes(data=data, mime_type=mime_type),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LLMImageExpenseListSchema,
                    temperature=0.1,
                ),
            )
            raw = response.parsed
            if raw is None:
                raw = LLMImageExpenseListSchema.model_validate_json(response.text)

            if not raw.found or not raw.items:
                raise ValueError("No payment/transaction found in this image")

            return [
                ParsedExpense(
                    raw_input=raw_input,
                    amount=item.amount,
                    currency="INR",
                    category=item.category,
                    subcategory=item.subcategory,
                    merchant=item.merchant,
                    payment_method=item.payment_method,
                    date=_parse_date_safe(item.date, today),
                    tags=item.tags,
                    notes=item.notes,
                    source=Source.IMAGE,
                    llm_model=settings.gemini_model,
                )
                for item in raw.items[:MAX_BATCH_ITEMS]
            ]
        except ValueError as exc:
            if str(exc) == "No payment/transaction found in this image":
                raise
            last_error = str(exc)
            continue
        except (ValidationError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            continue

    raise ValueError(f"LLM failed to produce a valid expense after retries: {last_error}")
