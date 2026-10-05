from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


class PingResult(Base):
    __tablename__ = "ping_results"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("monitored_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # UP, DOWN, TIMEOUT, ERROR
    latency_ms = Column(Float, nullable=True)
    packet_loss = Column(Float, default=0.0, nullable=False)
    response_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    target = relationship("MonitoredTarget", back_populates="results")


# Compound index for fast time-series queries per target
Index("idx_target_timestamp", PingResult.target_id, PingResult.timestamp)
