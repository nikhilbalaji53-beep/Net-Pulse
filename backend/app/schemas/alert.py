from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    id: int
    target_id: int
    target_name: Optional[str] = None
    target_host: Optional[str] = None
    incident_id: Optional[int] = None
    alert_type: str
    message: str
    sent_at: datetime
    delivery_status: str

    model_config = ConfigDict(from_attributes=True)
