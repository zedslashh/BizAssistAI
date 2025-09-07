import motor.motor_asyncio
from fastapi import Depends
from typing import AsyncGenerator
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "myapp")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def get_db() -> AsyncGenerator:
    yield db

def get_collection(name: str):
    return db[name]
