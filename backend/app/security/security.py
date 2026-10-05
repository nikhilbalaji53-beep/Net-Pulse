import re
import socket
import ipaddress
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verifies a plain password against the stored bcrypt hash."""
    try:
        plain_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt password hash."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Network & SSRF Security Checkers
def validate_safe_host_string(host: str) -> str:
    """Ensure host doesn't contain shell metacharacters or dangerous control chars."""
    if not host or not isinstance(host, str):
        raise ValueError("Host cannot be empty")
    host = host.strip()
    if re.search(r"[;&|`$<>\r\n\\/\s]", host):
        raise ValueError("Host contains illegal or dangerous characters")
    return host


def is_ip_allowed(ip_str: str, allow_private: bool = True) -> bool:
    """Validate IP address and apply private/loopback/cloud metadata filtering if restricted."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        # Block cloud metadata addresses always (e.g., 169.254.169.254)
        if ip_obj.is_link_local or str(ip_obj) == "169.254.169.254":
            return False
        if not allow_private:
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved:
                return False
        return True
    except ValueError:
        return False
