from models.user import User
from .mongo import get_collection
from typing import Optional

users_coll = get_collection("users")

async def upsert_user(user: User) -> User:
    await users_coll.update_one(
        {"id": user.id},
        {"$set": user.dict()},
        upsert=True
    )
    return user

async def get_user(user_id: str) -> Optional[User]:
    doc = await users_coll.find_one({"id": user_id})
    return User(**doc) if doc else None
