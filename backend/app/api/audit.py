from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.security.deps import get_current_admin

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    query = (
        select(AuditLog, User.name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
    )
    res = await db.execute(query)
    rows = res.all()

    logs = []
    for log, user_name in rows:
        logs.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=user_name,
            action=log.action,
            details=log.details,
            ip_address=log.ip_address,
            timestamp=log.timestamp
        ))
    return logs
