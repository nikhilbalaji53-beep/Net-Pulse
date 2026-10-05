from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    role: str = Field("Admin", pattern="^(Admin|Viewer)$")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address format")
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address format")
        return v


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
