from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base


class MonitoredTarget(Base):
    __tablename__ = "monitored_targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    host = Column(String(255), nullable=False, index=True)
    monitoring_type = Column(String(50), nullable=False)  # ICMP, TCP, HTTP, HOSTNAME
    port = Column(Integer, nullable=True)
    url = Column(String(1024), nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(100), default="Primary Datacenter", nullable=False)
    environment = Column(String(50), default="Production", nullable=False)  # Production, Development, Testing, Office, Home, Cloud
    
    interval_seconds = Column(Integer, default=30, nullable=False)
    timeout_seconds = Column(Integer, default=5, nullable=False)
    failure_threshold = Column(Integer, default=3, nullable=False)
    recovery_threshold = Column(Integer, default=2, nullable=False)
    
    consecutive_failures = Column(Integer, default=0, nullable=False)
    consecutive_successes = Column(Integer, default=0, nullable=False)
    
    enabled = Column(Boolean, default=True, nullable=False)
    current_status = Column(String(50), default="PENDING", nullable=False, index=True)  # ONLINE, OFFLINE, WARNING, PAUSED, PENDING
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    last_online_at = Column(DateTime(timezone=True), nullable=True)
    last_offline_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    results = relationship("PingResult", back_populates="target", cascade="all, delete-orphan", passive_deletes=True)
    incidents = relationship("Incident", back_populates="target", cascade="all, delete-orphan", passive_deletes=True)
    alerts = relationship("Alert", back_populates="target", cascade="all, delete-orphan", passive_deletes=True)
