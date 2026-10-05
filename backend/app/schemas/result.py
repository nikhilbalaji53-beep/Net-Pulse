from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PingResultResponse(BaseModel):
    id: int
    target_id: int
    timestamp: datetime
    status: str
    latency_ms: Optional[float] = None
    packet_loss: float
    response_code: Optional[int] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LatencyPoint(BaseModel):
    timestamp: datetime
    latency_ms: Optional[float]
    status: str
