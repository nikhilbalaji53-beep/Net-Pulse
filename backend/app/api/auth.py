from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.security.security import verify_password, get_password_hash, create_access_token
from app.security.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Check if user already exists
    existing_user_q = await db.execute(select(User).where(User.email == user_in.email))
    if existing_user_q.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # First user registered automatically becomes Admin
    count_q = await db.execute(select(User))
    all_users = count_q.scalars().all()
    role = "Admin" if len(all_users) == 0 else user_in.role

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role,
        last_login=datetime.now(timezone.utc)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "USER_REGISTERED", f"User {user.email} registered with role {user.role}", user.id, client_ip)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    user_q = await db.execute(select(User).where(User.email == credentials.email))
    user = user_q.scalars().first()

    if not user or not verify_password(credentials.password, user.password_hash):
        client_ip = request.client.host if request.client else "unknown"
        await log_audit_event(db, "AUTH_FAILURE", f"Failed login attempt for {credentials.email}", None, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "AUTH_SUCCESS", f"User {user.email} logged in", user.id, client_ip)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
