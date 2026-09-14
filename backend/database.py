from motor.motor_asyncio import AsyncIOMotorClient

from config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]

expenses_collection = db["expenses"]
categories_collection = db["categories"]
budgets_collection = db["budgets"]
users_collection = db["users"]
refresh_tokens_collection = db["refresh_tokens"]


async def ensure_indexes() -> None:
    await expenses_collection.create_index([("user_id", 1), ("date", -1)])
    await expenses_collection.create_index("category")
    await expenses_collection.create_index([("merchant", "text"), ("notes", "text")])
    await categories_collection.create_index("name", unique=True)
    await budgets_collection.create_index([("user_id", 1), ("category", 1), ("month", 1)], unique=True)
    await users_collection.create_index("email", unique=True)
    await refresh_tokens_collection.create_index("token_hash", unique=True)
    await refresh_tokens_collection.create_index([("user_id", 1), ("expires_at", 1)])


DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "icon": "utensils", "color": "#F59E0B"},
    {"name": "Groceries", "icon": "shopping-cart", "color": "#84CC16"},
    {"name": "Transportation", "icon": "car", "color": "#3B82F6"},
    {"name": "Shopping", "icon": "bag", "color": "#EC4899"},
    {"name": "Entertainment", "icon": "film", "color": "#8B5CF6"},
    {"name": "Bills & Utilities", "icon": "receipt", "color": "#EF4444"},
    {"name": "Health & Fitness", "icon": "heart", "color": "#10B981"},
    {"name": "Travel", "icon": "plane", "color": "#06B6D4"},
    {"name": "Education", "icon": "book", "color": "#6366F1"},
    {"name": "Rent & Housing", "icon": "home", "color": "#F97316"},
    {"name": "Personal Care", "icon": "sparkles", "color": "#D946EF"},
    {"name": "Other", "icon": "dots-horizontal", "color": "#6B7280"},
]


async def seed_categories() -> None:
    count = await categories_collection.count_documents({})
    if count == 0:
        await categories_collection.insert_many(DEFAULT_CATEGORIES)
