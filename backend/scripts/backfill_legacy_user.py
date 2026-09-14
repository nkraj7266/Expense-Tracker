"""One-time migration: reassign expenses created under the old hardcoded
`user_id: "nitin"` to a real account's ObjectId, per AUTH_PLAN.md §8.

Usage (run from backend/, with the venv active):
    1. Sign up the real account through the app/API first, e.g.:
       POST /auth/signup {"email": "nitin@example.com", "password": "..."}
    2. python scripts/backfill_legacy_user.py --email nitin@example.com

Safe to re-run: matches only documents still tagged with the legacy literal
"nitin", so running it twice is a no-op the second time.
"""

import argparse
import asyncio
import sys

sys.path.insert(0, ".")

from database import expenses_collection, users_collection  # noqa: E402

LEGACY_USER_ID = "nitin"


async def backfill(email: str) -> None:
    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        print(f"No account found for {email!r}. Sign up that account first, then re-run this script.")
        return

    new_user_id = str(user["_id"])
    result = await expenses_collection.update_many(
        {"user_id": LEGACY_USER_ID}, {"$set": {"user_id": new_user_id}}
    )
    print(f"Matched {result.matched_count} legacy expense(s); updated {result.modified_count} to user_id={new_user_id}.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="Email of the already-created account to backfill into")
    args = parser.parse_args()
    asyncio.run(backfill(args.email))


if __name__ == "__main__":
    main()
