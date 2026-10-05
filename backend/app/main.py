import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import settings
from app.database.session import engine, Base, AsyncSessionLocal
from app.models.user import User
from app.models.target import MonitoredTarget
from app.security.security import get_password_hash
from app.monitoring.engine import monitoring_engine
from app.websocket.manager import ws_manager
from app.api.api_router import api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("netpulse.main")


async def init_db_and_seed():
    """Initializes tables and seeds initial administrative account and default targets."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed initial admin user if empty
        user_res = await session.execute(select(User))
        admin = user_res.scalars().first()
        if not admin:
            admin_user = User(
                name="System Administrator",
                email="admin@netpulse.io",
                password_hash=get_password_hash("admin123"),
                role="Admin",
                created_at=datetime.now(timezone.utc),
                last_login=None
            )
            session.add(admin_user)
            await session.commit()
            logger.info("SEED: Created default administrator (admin@netpulse.io / admin123)")
        elif admin.email == "admin@netpulse.local":
            admin.email = "admin@netpulse.io"
            await session.commit()

        # 2. Seed real default test endpoints if none exist (8.8.8.8, 1.1.1.1, Cloudflare HTTP)
        target_res = await session.execute(select(MonitoredTarget))
        targets = target_res.scalars().all()
        if not targets:
            default_targets = [
                MonitoredTarget(
                    name="Google DNS Primary",
                    host="8.8.8.8",
                    monitoring_type="ICMP",
                    description="Global primary public DNS resolver",
                    location="Global Anycast",
                    environment="Production",
                    interval_seconds=15,
                    timeout_seconds=5,
                    failure_threshold=3,
                    recovery_threshold=2,
                    enabled=True,
                    current_status="PENDING"
                ),
                MonitoredTarget(
                    name="Cloudflare DNS",
                    host="1.1.1.1",
                    monitoring_type="ICMP",
                    description="Privacy-first fast DNS resolver",
                    location="Global Edge",
                    environment="Production",
                    interval_seconds=15,
                    timeout_seconds=5,
                    failure_threshold=3,
                    recovery_threshold=2,
                    enabled=True,
                    current_status="PENDING"
                ),
                MonitoredTarget(
                    name="Google Web HTTPS",
                    host="google.com",
                    monitoring_type="HTTP",
                    url="https://www.google.com",
                    description="Search and cloud services portal",
                    location="US-Central",
                    environment="Production",
                    interval_seconds=30,
                    timeout_seconds=5,
                    failure_threshold=3,
                    recovery_threshold=2,
                    enabled=True,
                    current_status="PENDING"
                ),
                MonitoredTarget(
                    name="Cloudflare HTTPS API",
                    host="1.1.1.1",
                    monitoring_type="TCP",
                    port=443,
                    description="TCP 443 TLS Port availability check",
                    location="Global Anycast",
                    environment="Production",
                    interval_seconds=20,
                    timeout_seconds=5,
                    failure_threshold=3,
                    recovery_threshold=2,
                    enabled=True,
                    current_status="PENDING"
                )
            ]
            for t in default_targets:
                session.add(t)
            await session.commit()
            logger.info(f"SEED: Configured {len(default_targets)} default real network targets for monitoring")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NetPulse backend starting up...")
    await init_db_and_seed()
    await monitoring_engine.start()
    yield
    logger.info("NetPulse backend shutting down...")
    await monitoring_engine.stop()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NetPulse — Intelligent Real-Time Ping & Network Infrastructure Monitoring System",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for flexible frontend connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST APIs
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint confirming DB and engine readiness."""
    db_status = "connected"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(select(1))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" and monitoring_engine.is_running else "degraded",
        "database": db_status,
        "monitoring_engine": "running" if monitoring_engine.is_running else "stopped",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION
    }


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket endpoint for monitor updates and alert streams."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
