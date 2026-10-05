from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("monitored_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_type = Column(String(50), nullable=False, index=True)  # OFFLINE, ONLINE, HIGH_LATENCY, HIGH_PACKET_LOSS
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    delivery_status = Column(String(50), default="DELIVERED", nullable=False)  # DELIVERED, FAILED, PENDING

    target = relationship("MonitoredTarget", back_populates="alerts")
    incident = relationship("Incident", back_populates="alerts")
