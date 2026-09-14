from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from database import expenses_collection
from models_auth import UserOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _month_bounds(d: date) -> tuple[date, date]:
    start = d.replace(day=1)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    return start, next_month


def _week_bounds(d: date) -> tuple[date, date]:
    start = d - timedelta(days=d.weekday())
    end = start + timedelta(days=7)
    return start, end


@router.get("/summary")
async def summary(
    period: Literal["daily", "weekly", "monthly"] = "monthly",
    date_param: date = Query(default_factory=date.today, alias="date"),
    user: UserOut = Depends(get_current_user),
):
    if period == "daily":
        start, end = date_param, date_param + timedelta(days=1)
    elif period == "weekly":
        start, end = _week_bounds(date_param)
    else:
        start, end = _month_bounds(date_param)

    query = {
        "user_id": user.id,
        "date": {
            "$gte": datetime.combine(start, datetime.min.time()),
            "$lt": datetime.combine(end, datetime.min.time()),
        },
    }
    docs = await expenses_collection.find(query).to_list(length=10000)

    total = sum(d["amount"] for d in docs)
    by_category: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
    for d in docs:
        entry = by_category[d["category"]]
        entry["total"] += d["amount"]
        entry["count"] += 1

    category_breakdown = [
        {"category": cat, "total": round(v["total"], 2), "count": v["count"]}
        for cat, v in sorted(by_category.items(), key=lambda kv: kv[1]["total"], reverse=True)
    ]

    return {
        "period": period,
        "start": start.isoformat(),
        "end": (end - timedelta(days=1)).isoformat(),
        "total": round(total, 2),
        "count": len(docs),
        "category_breakdown": category_breakdown,
    }


@router.get("/trend")
async def trend(
    date_from: date = Query(alias="from"),
    date_to: date = Query(alias="to"),
    group_by: Literal["day", "week", "month"] = "day",
    user: UserOut = Depends(get_current_user),
):
    if date_from > date_to:
        raise HTTPException(status_code=400, detail="'from' must be before 'to'")

    query = {
        "user_id": user.id,
        "date": {
            "$gte": datetime.combine(date_from, datetime.min.time()),
            "$lte": datetime.combine(date_to, datetime.max.time()),
        },
    }
    docs = await expenses_collection.find(query).to_list(length=20000)

    def bucket_key(d) -> str:
        d = d.date() if isinstance(d, datetime) else d
        if group_by == "day":
            return d.isoformat()
        if group_by == "week":
            start, _ = _week_bounds(d)
            return start.isoformat()
        return d.strftime("%Y-%m-01")

    buckets: dict[str, float] = defaultdict(float)
    for doc in docs:
        buckets[bucket_key(doc["date"])] += doc["amount"]

    series = [{"period": k, "total": round(v, 2)} for k, v in sorted(buckets.items())]
    return {"group_by": group_by, "from": date_from.isoformat(), "to": date_to.isoformat(), "series": series}
