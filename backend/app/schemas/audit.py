from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
