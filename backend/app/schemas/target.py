from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re


class TargetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    host: str = Field(..., min_length=1, max_length=255)
    monitoring_type: str = Field("ICMP", pattern="^(ICMP|TCP|HTTP|HOSTNAME)$")
    port: Optional[int] = Field(None, ge=1, le=65535)
    url: Optional[str] = Field(None, max_length=1024)
    description: Optional[str] = Field(None, max_length=1000)
    location: str = Field("Primary Datacenter", max_length=100)
    environment: str = Field("Production", pattern="^(Production|Development|Testing|Office|Home|Cloud)$")
    interval_seconds: int = Field(30, ge=5, le=86400)
    timeout_seconds: int = Field(5, ge=1, le=60)
    failure_threshold: int = Field(3, ge=1, le=20)
    recovery_threshold: int = Field(2, ge=1, le=20)
    enabled: bool = True

    @field_validator("host")
    @classmethod
    def validate_safe_host(cls, v: str) -> str:
        v = v.strip()
        # Disallow shell metacharacters and control characters
        if re.search(r"[;&|`$<>\r\n\\/\s]", v):
            # If it's a URL in host field by accident, strip protocol if HTTP
            # but strictly forbid command injection chars
            raise ValueError("Host contains invalid characters or whitespace")
        return v

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("URL must start with http:// or https://")
        return v


class TargetCreate(TargetBase):
    pass


class TargetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    host: Optional[str] = Field(None, min_length=1, max_length=255)
    monitoring_type: Optional[str] = Field(None, pattern="^(ICMP|TCP|HTTP|HOSTNAME)$")
    port: Optional[int] = Field(None, ge=1, le=65535)
    url: Optional[str] = Field(None, max_length=1024)
    description: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = Field(None, pattern="^(Production|Development|Testing|Office|Home|Cloud)$")
    interval_seconds: Optional[int] = Field(None, ge=5, le=86400)
    timeout_seconds: Optional[int] = Field(None, ge=1, le=60)
    failure_threshold: Optional[int] = Field(None, ge=1, le=20)
    recovery_threshold: Optional[int] = Field(None, ge=1, le=20)
    enabled: Optional[bool] = None

    @field_validator("host")
    @classmethod
    def validate_safe_host(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if re.search(r"[;&|`$<>\r\n\\/\s]", v):
                raise ValueError("Host contains invalid characters or whitespace")
        return v


class TargetResponse(TargetBase):
    id: int
    consecutive_failures: int
    consecutive_successes: int
    current_status: str
    created_at: datetime
    updated_at: datetime
    last_checked_at: Optional[datetime] = None
    last_online_at: Optional[datetime] = None
    last_offline_at: Optional[datetime] = None
    
    # Extra calculated fields for quick view
    latest_latency_ms: Optional[float] = None
    uptime_percentage: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
