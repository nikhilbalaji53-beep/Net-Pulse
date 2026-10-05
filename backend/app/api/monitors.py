import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, asc, func

from app.database.session import get_db
from app.models.user import User
from app.models.target import MonitoredTarget
from app.models.result import PingResult
from app.schemas.target import TargetCreate, TargetUpdate, TargetResponse
from app.schemas.result import PingResultResponse
from app.schemas.stats import UptimeStats
from app.security.deps import get_current_user, get_current_admin
from app.services.audit_service import log_audit_event
from app.services.stats_service import get_target_uptime_stats
from app.monitoring.engine import monitoring_engine
from app.security.security import is_ip_allowed
from app.config import settings

router = APIRouter(prefix="/monitors", tags=["Monitors"])


@router.get("", response_model=List[TargetResponse])
async def list_monitors(
    search: Optional[str] = None,
    status: Optional[str] = None,
    monitoring_type: Optional[str] = None,
    environment: Optional[str] = None,
    location: Optional[str] = None,
    sort_by: str = Query("name", pattern="^(name|latency|uptime|last_checked)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(MonitoredTarget)

    # Filtering
    conditions = []
    if search:
        search_fmt = f"%{search.strip()}%"
        conditions.append(
            (MonitoredTarget.name.ilike(search_fmt)) |
            (MonitoredTarget.host.ilike(search_fmt)) |
            (MonitoredTarget.url.ilike(search_fmt))
        )
    if status:
        if status.upper() == "PAUSED":
            conditions.append(MonitoredTarget.enabled == False)
        else:
            conditions.append(MonitoredTarget.current_status == status.upper())
            conditions.append(MonitoredTarget.enabled == True)
    if monitoring_type:
        conditions.append(MonitoredTarget.monitoring_type == monitoring_type.upper())
    if environment:
        conditions.append(MonitoredTarget.environment == environment)
    if location:
        conditions.append(MonitoredTarget.location == location)

    if conditions:
        query = query.where(and_(*conditions))

    if sort_by == "name":
        query = query.order_by(asc(MonitoredTarget.name) if sort_order == "asc" else desc(MonitoredTarget.name))
    elif sort_by == "last_checked":
        query = query.order_by(asc(MonitoredTarget.last_checked_at) if sort_order == "asc" else desc(MonitoredTarget.last_checked_at))
    else:
        query = query.order_by(desc(MonitoredTarget.created_at))

    result = await db.execute(query)
    targets = result.scalars().all()

    # Enrich with latest latency and 24h uptime
    response_list = []
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    for t in targets:
        # Latest latency
        latest_res_q = await db.execute(
            select(PingResult.latency_ms)
            .where(and_(PingResult.target_id == t.id, PingResult.status == "UP"))
            .order_by(desc(PingResult.timestamp))
            .limit(1)
        )
        latest_latency = latest_res_q.scalar()

        # Uptime 24h
        tot_q = await db.execute(
            select(func.count(PingResult.id)).where(
                and_(PingResult.target_id == t.id, PingResult.timestamp >= since_24h)
            )
        )
        total_checks = tot_q.scalar() or 0

        succ_q = await db.execute(
            select(func.count(PingResult.id)).where(
                and_(PingResult.target_id == t.id, PingResult.timestamp >= since_24h, PingResult.status == "UP")
            )
        )
        successful_checks = succ_q.scalar() or 0

        uptime_val = round((successful_checks / total_checks) * 100.0, 2) if total_checks > 0 else (100.0 if t.current_status != "OFFLINE" else 0.0)

        t_dict = TargetResponse.model_validate(t)
        t_dict.latest_latency_ms = latest_latency
        t_dict.uptime_percentage = uptime_val
        response_list.append(t_dict)

    if sort_by == "latency":
        response_list.sort(key=lambda x: (x.latest_latency_ms is None, x.latest_latency_ms or 0), reverse=(sort_order == "desc"))
    elif sort_by == "uptime":
        response_list.sort(key=lambda x: x.uptime_percentage or 0, reverse=(sort_order == "desc"))

    return response_list


@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
async def create_monitor(
    target_in: TargetCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    # Verify private IP restriction if configured
    if not settings.ALLOW_PRIVATE_IPS and not is_ip_allowed(target_in.host, allow_private=False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Monitoring private/reserved IP ranges is disabled by administrator security policy"
        )

    target = MonitoredTarget(
        name=target_in.name,
        host=target_in.host,
        monitoring_type=target_in.monitoring_type.upper(),
        port=target_in.port,
        url=target_in.url,
        description=target_in.description,
        location=target_in.location,
        environment=target_in.environment,
        interval_seconds=target_in.interval_seconds,
        timeout_seconds=target_in.timeout_seconds,
        failure_threshold=target_in.failure_threshold,
        recovery_threshold=target_in.recovery_threshold,
        enabled=target_in.enabled,
        current_status="PENDING"
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "TARGET_CREATED", f"Created target '{target.name}' ({target.host})", admin_user.id, client_ip)

    # Immediately trigger an initial check in background
    asyncio.create_task(monitoring_engine.check_target_now(target.id))

    return TargetResponse.model_validate(target)


@router.get("/{id}", response_model=TargetResponse)
async def get_monitor(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    # Get latest latency
    lat_q = await db.execute(
        select(PingResult.latency_ms)
        .where(and_(PingResult.target_id == target.id, PingResult.status == "UP"))
        .order_by(desc(PingResult.timestamp))
        .limit(1)
    )
    latest_lat = lat_q.scalar()

    # Get 24h uptime
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    tot_q = await db.execute(
        select(func.count(PingResult.id)).where(
            and_(PingResult.target_id == target.id, PingResult.timestamp >= since_24h)
        )
    )
    total_checks = tot_q.scalar() or 0

    succ_q = await db.execute(
        select(func.count(PingResult.id)).where(
            and_(PingResult.target_id == target.id, PingResult.timestamp >= since_24h, PingResult.status == "UP")
        )
    )
    succ_checks = succ_q.scalar() or 0
    uptime_val = round((succ_checks / total_checks) * 100.0, 2) if total_checks > 0 else 100.0

    t_resp = TargetResponse.model_validate(target)
    t_resp.latest_latency_ms = latest_lat
    t_resp.uptime_percentage = uptime_val
    return t_resp


@router.put("/{id}", response_model=TargetResponse)
async def update_monitor(
    id: int,
    target_in: TargetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    update_data = target_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)

    target.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(target)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "TARGET_UPDATED", f"Updated target '{target.name}'", admin_user.id, client_ip)

    return TargetResponse.model_validate(target)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_monitor(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    target_name = target.name
    await db.delete(target)
    await db.commit()

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "TARGET_DELETED", f"Deleted target '{target_name}' (ID: {id})", admin_user.id, client_ip)
    return None


@router.post("/{id}/pause", response_model=TargetResponse)
async def pause_monitor(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    target.enabled = False
    target.current_status = "PAUSED"
    await db.commit()
    await db.refresh(target)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "MONITORING_PAUSED", f"Paused monitoring for '{target.name}'", admin_user.id, client_ip)

    return TargetResponse.model_validate(target)


@router.post("/{id}/resume", response_model=TargetResponse)
async def resume_monitor(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    target.enabled = True
    target.current_status = "PENDING"
    await db.commit()
    await db.refresh(target)

    client_ip = request.client.host if request.client else "unknown"
    await log_audit_event(db, "MONITORING_RESUMED", f"Resumed monitoring for '{target.name}'", admin_user.id, client_ip)

    # Immediately trigger check
    asyncio.create_task(monitoring_engine.check_target_now(target.id))

    return TargetResponse.model_validate(target)


@router.post("/{id}/check")
async def trigger_manual_check(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers an immediate real network check for this target."""
    result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target monitor not found")

    check_res = await monitoring_engine.check_target_now(target.id)
    return {"message": "Check executed successfully", "result": check_res}


@router.get("/{id}/results", response_model=List[PingResultResponse])
async def get_monitor_results(
    id: int,
    range: str = Query("24h", pattern="^(1h|6h|24h|7d|30d)$"),
    limit: int = Query(200, ge=10, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    delta_map = {
        "1h": timedelta(hours=1),
        "6h": timedelta(hours=6),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }
    since = now - delta_map[range]

    query = (
        select(PingResult)
        .where(and_(PingResult.target_id == id, PingResult.timestamp >= since))
        .order_by(asc(PingResult.timestamp))
        .limit(limit)
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return [PingResultResponse.model_validate(r) for r in records]


@router.get("/{id}/uptime", response_model=UptimeStats)
async def get_monitor_uptime(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_target_uptime_stats(db, id)
