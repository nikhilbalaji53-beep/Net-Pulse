from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database.session import get_db
from app.models.alert import Alert
from app.models.target import MonitoredTarget
from app.models.user import User
from app.schemas.alert import AlertResponse
from app.security.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    alert_type: Optional[str] = Query(None, pattern="^(OFFLINE|ONLINE|HIGH_LATENCY|HIGH_PACKET_LOSS)$"),
    target_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Alert, MonitoredTarget.name, MonitoredTarget.host).join(
        MonitoredTarget, Alert.target_id == MonitoredTarget.id
    )

    conditions = []
    if alert_type:
        conditions.append(Alert.alert_type == alert_type)
    if target_id:
        conditions.append(Alert.target_id == target_id)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(desc(Alert.sent_at)).limit(limit)
    res = await db.execute(query)
    rows = res.all()

    alerts = []
    for alert, target_name, target_host in rows:
        alert_resp = AlertResponse(
            id=alert.id,
            target_id=alert.target_id,
            target_name=target_name,
            target_host=target_host,
            incident_id=alert.incident_id,
            alert_type=alert.alert_type,
            message=alert.message,
            sent_at=alert.sent_at,
            delivery_status=alert.delivery_status
        )
        alerts.append(alert_resp)

    return alerts
