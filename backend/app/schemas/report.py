from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ReportSummary(BaseModel):
    target_id: int
    target_name: str
    target_host: str
    monitoring_type: str
    environment: str
    total_checks: int
    successful_checks: int
    failed_checks: int
    uptime_percentage: float
    downtime_minutes: float
    avg_latency_ms: Optional[float]
    max_latency_ms: Optional[float]
    min_latency_ms: Optional[float]
    avg_packet_loss: float
    incident_count: int


class ReportResponse(BaseModel):
    generated_at: datetime
    start_date: datetime
    end_date: datetime
    overall_uptime_percentage: float
    total_incidents: int
    targets: List[ReportSummary]
