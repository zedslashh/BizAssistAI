from pydantic import BaseModel
from typing import List, Optional, Literal

class ChatRequest(BaseModel):
    orgId: str
    userId: str
    message: str

class ChatResponse(BaseModel):
    answer: str
    confidence: float
    sources: List[str] = []

class AgentNotifyRequest(BaseModel):
    orgId: str
    conversationId: Optional[str] = None
    message: str
    channel: Literal["slack", "teams", "zendesk"]

class StatsResponse(BaseModel):
    messagesToday: int
    avgLatencyMs: int
    deflections: int
    handoffs: int
