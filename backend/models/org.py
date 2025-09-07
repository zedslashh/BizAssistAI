from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal

Vertical = Literal["education", "healthcare", "ecommerce", "finance", "other"]
Integration = Literal["widget", "landing"]
Languages = Literal["en", "ta"]

class Org(BaseModel):
    id: str
    name: str
    email: EmailStr
    vertical: Vertical
    integration: Integration
    languages: List[Languages]
    filesMeta: Optional[List[str]] = []
    integration_code: Optional[str] = None
    landing_url: Optional[str] = None

class OnboardingRequest(BaseModel):
    orgName: str
    email: EmailStr
    vertical: Vertical
    integration: Integration
    languages: List[Languages]
    filesMeta: Optional[List[str]] = []