from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.monitors import router as monitors_router
from app.api.incidents import router as incidents_router
from app.api.alerts import router as alerts_router
from app.api.stats import router as stats_router
from app.api.reports import router as reports_router
from app.api.audit import router as audit_router
from app.api.settings import router as settings_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(monitors_router)
api_router.include_router(incidents_router)
api_router.include_router(alerts_router)
api_router.include_router(stats_router)
api_router.include_router(reports_router)
api_router.include_router(audit_router)
api_router.include_router(settings_router)
