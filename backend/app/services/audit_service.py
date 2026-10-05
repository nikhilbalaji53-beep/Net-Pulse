from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
from datetime import datetime, timezone


async def log_audit_event(
    db: AsyncSession,
    action: str,
    details: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None
):
    """Safely records an audit log entry in the database."""
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log_entry)
        await db.commit()
    except Exception as e:
        # Never let audit failure block the primary operation
        print(f"Failed to record audit log: {e}")
