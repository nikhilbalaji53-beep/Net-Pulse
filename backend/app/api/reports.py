from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.report import ReportResponse
from app.security.deps import get_current_user
from app.services.report_service import generate_report_data, export_report_csv

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=ReportResponse)
async def get_report(
    start_date: datetime = Query(default_factory=lambda: datetime.now(timezone.utc) - timedelta(days=7)),
    end_date: datetime = Query(default_factory=lambda: datetime.now(timezone.utc)),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await generate_report_data(db, start_date, end_date)


@router.get("/export")
async def export_csv(
    start_date: datetime = Query(default_factory=lambda: datetime.now(timezone.utc) - timedelta(days=7)),
    end_date: datetime = Query(default_factory=lambda: datetime.now(timezone.utc)),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report_data = await generate_report_data(db, start_date, end_date)
    csv_content = export_report_csv(report_data)

    filename = f"netpulse_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
