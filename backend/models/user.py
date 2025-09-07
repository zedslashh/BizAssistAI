# backend/models/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal

Role = Literal["admin", "user", "both"]

class User(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Role = "user"
