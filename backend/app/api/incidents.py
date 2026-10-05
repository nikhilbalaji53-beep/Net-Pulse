from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database.session import get_db
from app.models.incident import Incident
from app.models.target import MonitoredTarget
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.security.deps import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = Query(None, pattern="^(OPEN|RESOLVED)$"),
    range: str = Query("all", pattern="^(24h|7d|30d|all)$"),
    target_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Incident, MonitoredTarget.name, MonitoredTarget.host).join(
        MonitoredTarget, Incident.target_id == MonitoredTarget.id
    )

    conditions = []
    if status:
        conditions.append(Incident.status == status.upper())
    if target_id:
        conditions.append(Incident.target_id == target_id)

    if range != "all":
        now = datetime.now(timezone.utc)
        delta_map = {
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
        }
        since = now - delta_map[range]
        conditions.append(Incident.started_at >= since)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(desc(Incident.started_at)).limit(limit)
    res = await db.execute(query)
    rows = res.all()

    incidents = []
    for inc, target_name, target_host in rows:
        inc_resp = IncidentResponse(
            id=inc.id,
            target_id=inc.target_id,
            target_name=target_name,
            target_host=target_host,
            started_at=inc.started_at,
            resolved_at=inc.resolved_at,
            duration_seconds=inc.duration_seconds,
            reason=inc.reason,
            status=inc.status
        )
        incidents.append(inc_resp)

    return incidents
