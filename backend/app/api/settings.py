from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.security.deps import get_current_user, get_current_admin
from app.services.audit_service import log_audit_event
from app.database.session import get_db

router = APIRouter(prefix="/settings", tags=["Settings"])


class SystemSettingsSchema(BaseModel):
    default_ping_interval: int
    default_timeout: int
    default_failure_threshold: int
    default_recovery_threshold: int
    latency_excellent_threshold: float
    latency_good_threshold: float
    latency_warning_threshold: float
    latency_critical_threshold: float
    packet_loss_warning_threshold: float
    packet_loss_critical_threshold: float
    data_retention_days: int
    allow_private_ips: bool
    smtp_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from_email: str


@router.get("", response_model=SystemSettingsSchema)
async def get_system_settings(
    current_user: User = Depends(get_current_user)
):
    return SystemSettingsSchema(
        default_ping_interval=settings.DEFAULT_PING_INTERVAL,
        default_timeout=settings.DEFAULT_TIMEOUT,
        default_failure_threshold=settings.DEFAULT_FAILURE_THRESHOLD,
        default_recovery_threshold=settings.DEFAULT_RECOVERY_THRESHOLD,
        latency_excellent_threshold=settings.LATENCY_EXCELLENT_THRESHOLD,
        latency_good_threshold=settings.LATENCY_GOOD_THRESHOLD,
        latency_warning_threshold=settings.LATENCY_WARNING_THRESHOLD,
        latency_critical_threshold=settings.LATENCY_CRITICAL_THRESHOLD,
        packet_loss_warning_threshold=settings.PACKET_LOSS_WARNING_THRESHOLD,
        packet_loss_critical_threshold=settings.PACKET_LOSS_CRITICAL_THRESHOLD,
        data_retention_days=settings.DATA_RETENTION_DAYS,
        allow_private_ips=settings.ALLOW_PRIVATE_IPS,
        smtp_enabled=settings.SMTP_ENABLED,
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_from_email=settings.SMTP_FROM_EMAIL
    )


@router.put("", response_model=SystemSettingsSchema)
async def update_system_settings(
    updated: SystemSettingsSchema,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    settings.DEFAULT_PING_INTERVAL = updated.default_ping_interval
    settings.DEFAULT_TIMEOUT = updated.default_timeout
    settings.DEFAULT_FAILURE_THRESHOLD = updated.default_failure_threshold
    settings.DEFAULT_RECOVERY_THRESHOLD = updated.default_recovery_threshold
    settings.LATENCY_EXCELLENT_THRESHOLD = updated.latency_excellent_threshold
    settings.LATENCY_GOOD_THRESHOLD = updated.latency_good_threshold
    settings.LATENCY_WARNING_THRESHOLD = updated.latency_warning_threshold
    settings.LATENCY_CRITICAL_THRESHOLD = updated.latency_critical_threshold
    settings.PACKET_LOSS_WARNING_THRESHOLD = updated.packet_loss_warning_threshold
    settings.PACKET_LOSS_CRITICAL_THRESHOLD = updated.packet_loss_critical_threshold
    settings.DATA_RETENTION_DAYS = updated.data_retention_days
    settings.ALLOW_PRIVATE_IPS = updated.allow_private_ips
    settings.SMTP_ENABLED = updated.smtp_enabled
    settings.SMTP_HOST = updated.smtp_host
    settings.SMTP_PORT = updated.smtp_port
    settings.SMTP_USER = updated.smtp_user
    settings.SMTP_FROM_EMAIL = updated.smtp_from_email

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "SETTINGS_UPDATED", "System settings updated by admin", admin_user.id, client_ip)

    return updated
