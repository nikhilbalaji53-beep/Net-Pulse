import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.target import MonitoredTarget
from app.models.incident import Incident
from app.config import settings
from app.websocket.manager import ws_manager

logger = logging.getLogger("netpulse.alerts")


async def send_email_notification(to_email: str, subject: str, html_body: str) -> bool:
    """Attempts sending email alert via SMTP if enabled."""
    if not settings.SMTP_ENABLED or not settings.SMTP_HOST:
        logger.debug("SMTP alerts disabled or unconfigured; skipping email dispatch")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{settings.PROJECT_NAME}] {subject}"
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        # Standard SMTP with TLS
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Alert email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")
        return False


async def create_and_dispatch_alert(
    db: AsyncSession,
    target: MonitoredTarget,
    alert_type: str,
    message: str,
    incident: Optional[Incident] = None
) -> Alert:
    """
    Creates an alert database record, broadcasts via WebSocket, and triggers notifications.
    """
    alert = Alert(
        target_id=target.id,
        incident_id=incident.id if incident else None,
        alert_type=alert_type,
        message=message,
        sent_at=datetime.now(timezone.utc),
        delivery_status="DELIVERED"
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    logger.warning(f"ALERT_SENT: [{alert_type}] for '{target.name}' ({target.host}): {message}")

    # Broadcast via WebSocket
    await ws_manager.broadcast({
        "type": "alert_triggered",
        "alert": {
            "id": alert.id,
            "target_id": target.id,
            "target_name": target.name,
            "target_host": target.host,
            "alert_type": alert_type,
            "message": message,
            "sent_at": alert.sent_at.isoformat(),
            "delivery_status": alert.delivery_status
        }
    })

    return alert
