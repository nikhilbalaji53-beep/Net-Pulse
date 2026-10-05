from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.stats import DashboardStats
from app.security.deps import get_current_user
from app.services.stats_service import get_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def fetch_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_dashboard_stats(db)
