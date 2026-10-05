from typing import Optional, List, Dict
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_monitors: int
    online: int
    offline: int
    warning: int
    paused: int
    overall_uptime_percentage: float
    active_incidents: int
    average_latency_ms: Optional[float] = None
    system_status: str  # HEALTHY, DEGRADED, CRITICAL


class UptimeStats(BaseModel):
    target_id: int
    uptime_1h: float
    uptime_24h: float
    uptime_7d: float
    uptime_30d: float
    total_checks_30d: int
    successful_checks_30d: int
    failed_checks_30d: int
