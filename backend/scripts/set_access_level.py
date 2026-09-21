"""Grant or revoke admin access for an account, per docs/ADMIN_PANEL_PLAN.md §7.

Usage (run from backend/, with the venv active):
    python scripts/set_access_level.py --email someone@example.com --level admin
    python scripts/set_access_level.py --email someone@example.com --level user

`access_level` is never settable through the API - this script is the only place
that writes it, so granting admin access requires shell/DB access, not just an
HTTP request.
"""

import argparse
import asyncio
import sys

sys.path.insert(0, ".")

from database import users_collection  # noqa: E402
from models_auth import AccessLevel  # noqa: E402


async def set_access_level(email: str, level: str) -> None:
    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        print(f"No account found for {email!r}.")
        return

    previous = user.get("access_level", AccessLevel.USER.value)
    if previous == level:
        print(f"{email}: access_level is already {level!r}, nothing to do.")
        return

    await users_collection.update_one({"_id": user["_id"]}, {"$set": {"access_level": level}})
    print(f"{email}: access_level {previous!r} -> {level!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True, help="Email of the account to update")
    parser.add_argument(
        "--level",
        required=True,
        choices=[level.value for level in AccessLevel],
        help="Access level to set",
    )
    args = parser.parse_args()
    asyncio.run(set_access_level(args.email, args.level))


if __name__ == "__main__":
    main()
