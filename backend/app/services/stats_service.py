from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.target import MonitoredTarget
from app.models.result import PingResult
from app.models.incident import Incident
from app.schemas.stats import DashboardStats, UptimeStats


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    """Calculates live aggregated dashboard metrics."""
    # 1. Total counts by status
    targets_res = await db.execute(select(MonitoredTarget))
    targets = targets_res.scalars().all()

    total = len(targets)
    online = sum(1 for t in targets if t.enabled and t.current_status == "ONLINE")
    offline = sum(1 for t in targets if t.enabled and t.current_status == "OFFLINE")
    warning = sum(1 for t in targets if t.enabled and t.current_status == "WARNING")
    paused = sum(1 for t in targets if not t.enabled)

    # 2. Active incidents
    incidents_res = await db.execute(select(func.count(Incident.id)).where(Incident.status == "OPEN"))
    active_incidents = incidents_res.scalar() or 0

    # 3. Overall 24-hour uptime percentage
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)

    total_checks_res = await db.execute(
        select(func.count(PingResult.id)).where(PingResult.timestamp >= since_24h)
    )
    total_checks_24h = total_checks_res.scalar() or 0

    success_checks_res = await db.execute(
        select(func.count(PingResult.id)).where(
            and_(PingResult.timestamp >= since_24h, PingResult.status == "UP")
        )
    )
    success_checks_24h = success_checks_res.scalar() or 0

    if total_checks_24h > 0:
        overall_uptime = round((success_checks_24h / total_checks_24h) * 100.0, 2)
    else:
        overall_uptime = 100.0 if offline == 0 else 0.0

    # 4. Average latency across all recent checks (last 1 hour)
    since_1h = now - timedelta(hours=1)
    avg_latency_res = await db.execute(
        select(func.avg(PingResult.latency_ms)).where(
            and_(PingResult.timestamp >= since_1h, PingResult.status == "UP")
        )
    )
    avg_latency = avg_latency_res.scalar()
    avg_latency_val = round(avg_latency, 1) if avg_latency is not None else None

    # 5. System status classification
    if offline > 0 or active_incidents > 0:
        system_status = "CRITICAL" if offline >= 2 else "DEGRADED"
    elif warning > 0:
        system_status = "DEGRADED"
    else:
        system_status = "HEALTHY"

    return DashboardStats(
        total_monitors=total,
        online=online,
        offline=offline,
        warning=warning,
        paused=paused,
        overall_uptime_percentage=overall_uptime,
        active_incidents=active_incidents,
        average_latency_ms=avg_latency_val,
        system_status=system_status
    )


async def get_target_uptime_stats(db: AsyncSession, target_id: int) -> UptimeStats:
    """Calculates uptime percentages over 1h, 24h, 7d, 30d for a target."""
    now = datetime.now(timezone.utc)

    async def calc_uptime_for_period(delta: timedelta) -> tuple[float, int, int]:
        since = now - delta
        tot_q = await db.execute(
            select(func.count(PingResult.id)).where(
                and_(PingResult.target_id == target_id, PingResult.timestamp >= since)
            )
        )
        tot = tot_q.scalar() or 0

        succ_q = await db.execute(
            select(func.count(PingResult.id)).where(
                and_(PingResult.target_id == target_id, PingResult.timestamp >= since, PingResult.status == "UP")
            )
        )
        succ = succ_q.scalar() or 0

        pct = round((succ / tot) * 100.0, 2) if tot > 0 else 100.0
        return pct, tot, succ

    up_1h, _, _ = await calc_uptime_for_period(timedelta(hours=1))
    up_24h, _, _ = await calc_uptime_for_period(timedelta(hours=24))
    up_7d, _, _ = await calc_uptime_for_period(timedelta(days=7))
    up_30d, tot_30d, succ_30d = await calc_uptime_for_period(timedelta(days=30))

    return UptimeStats(
        target_id=target_id,
        uptime_1h=up_1h,
        uptime_24h=up_24h,
        uptime_7d=up_7d,
        uptime_30d=up_30d,
        total_checks_30d=tot_30d,
        successful_checks_30d=succ_30d,
        failed_checks_30d=tot_30d - succ_30d
    )
