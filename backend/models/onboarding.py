from pydantic import BaseModel, EmailStr
from typing import List, Optional
from .org import Vertical, Integration, Languages


class OnboardingRequest(BaseModel):
    orgName: str
    email: EmailStr
    vertical: Vertical
    integration: Integration
    languages: List[Languages]
    filesMeta: Optional[List[str]] = []
