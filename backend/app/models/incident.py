from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("monitored_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, RESOLVED

    target = relationship("MonitoredTarget", back_populates="incidents")
    alerts = relationship("Alert", back_populates="incident")
