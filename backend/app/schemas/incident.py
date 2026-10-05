from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class IncidentResponse(BaseModel):
    id: int
    target_id: int
    target_name: Optional[str] = None
    target_host: Optional[str] = None
    started_at: datetime
    resolved_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    reason: str
    status: str

    model_config = ConfigDict(from_attributes=True)
