from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List, Dict, Any
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "chatbot_ai")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collection: vector_metadata
meta_collection = db["vector_metadata"]

async def insert_chunks(chunks: List[Dict[str, Any]]):
    """
    Insert metadata docs for embeddings.
    Each chunk should have: {orgId, fileId, page, text, embedding_id}
    """
    result = await meta_collection.insert_many(chunks)
    return result.inserted_ids

async def get_chunks_by_org(org_id: str):
    """Retrieve all chunks metadata for an org."""
    cursor = meta_collection.find({"orgId": org_id})
    return await cursor.to_list(length=None)

async def get_chunk_by_embedding_id(embed_id: str):
    """Get metadata for a specific embedding (FAISS id)."""
    return await meta_collection.find_one({"embedding_id": embed_id})

async def delete_by_org(org_id: str):
    """Remove all metadata for an org (e.g., re-ingestion)."""
    result = await meta_collection.delete_many({"orgId": org_id})
    return result.deleted_count
