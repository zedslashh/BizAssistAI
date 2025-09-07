from models.chat import ChatRequest, ChatResponse
from .mongo import get_collection
from typing import List

chats_coll = get_collection("chats")

async def save_chat(req: ChatRequest, res: ChatResponse):
    await chats_coll.insert_one({
        "orgId": req.orgId,
        "userId": req.userId,
        "message": req.message,
        "answer": res.answer,
        "confidence": res.confidence,
        "sources": res.sources,
    })

async def get_chats(org_id: str) -> List[dict]:
    cursor = chats_coll.find({"orgId": org_id})
    return [doc async for doc in cursor]
