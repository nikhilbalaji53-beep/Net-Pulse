import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from sqlalchemy import select, and_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import AsyncSessionLocal
from app.models.target import MonitoredTarget
from app.models.result import PingResult
from app.models.incident import Incident
from app.models.alert import Alert
from app.monitoring.checkers import execute_target_check
from app.alerts.engine import create_and_dispatch_alert
from app.websocket.manager import ws_manager
from app.config import settings

logger = logging.getLogger("netpulse.monitoring")


class MonitoringEngine:
    def __init__(self):
        self.is_running: bool = False
        self._loop_task: Optional[asyncio.Task] = None
        self._target_tasks: Dict[int, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def start(self):
        """Starts the monitoring scheduler and workers."""
        if self.is_running:
            return
        self.is_running = True
        logger.info("MONITOR_ENGINE_STARTED: Initializing background target monitors")
        self._loop_task = asyncio.create_task(self._main_scheduler_loop())

    async def stop(self):
        """Gracefully cancels all active worker tasks."""
        self.is_running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass

        async with self._lock:
            for target_id, task in list(self._target_tasks.items()):
                task.cancel()
            self._target_tasks.clear()
        logger.info("MONITOR_ENGINE_STOPPED: All monitoring loops terminated")

    async def _main_scheduler_loop(self):
        """
        Periodically checks database for enabled targets and spawns
        individual continuous async loops for any newly added/enabled targets.
        Also runs data retention prune.
        """
        last_retention_run = datetime.now(timezone.utc)

        while self.is_running:
            try:
                await self._sync_target_workers()

                # Run retention cleanup once every 6 hours
                if (datetime.now(timezone.utc) - last_retention_run).total_seconds() > 21600:
                    await self._cleanup_old_results()
                    last_retention_run = datetime.now(timezone.utc)

            except Exception as e:
                logger.error(f"Error in scheduler sync loop: {e}", exc_info=True)

            await asyncio.sleep(5)

    async def _sync_target_workers(self):
        """Synchronizes running async tasks with active targets in the DB."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.enabled == True))
            active_targets = result.scalars().all()
            active_target_ids = {t.id for t in active_targets}

            async with self._lock:
                # Cancel tasks for targets that are now disabled or deleted
                for t_id in list(self._target_tasks.keys()):
                    if t_id not in active_target_ids:
                        self._target_tasks[t_id].cancel()
                        del self._target_tasks[t_id]
                        logger.info(f"Canceled monitoring worker for target ID {t_id}")

                # Start worker tasks for newly enabled targets
                for target in active_targets:
                    if target.id not in self._target_tasks or self._target_tasks[target.id].done():
                        task = asyncio.create_task(self._run_target_loop(target.id, target.interval_seconds))
                        self._target_tasks[target.id] = task
                        logger.info(f"Started monitoring worker for target ID {target.id} ('{target.name}')")

    async def _run_target_loop(self, target_id: int, interval: int):
        """Continuous dedicated loop for a single target."""
        while self.is_running:
            try:
                # Execute single check
                await self.check_target_now(target_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in target worker {target_id}: {e}", exc_info=True)

            # Sleep for the configured interval
            try:
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break

    async def check_target_now(self, target_id: int) -> Optional[Dict[str, Any]]:
        """
        Executes a real check for a target, updates status, handles state transitions,
        creates/resolves incidents, generates alerts, and broadcasts via WebSocket.
        """
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(MonitoredTarget).where(MonitoredTarget.id == target_id))
            target = result.scalars().first()
            if not target or not target.enabled:
                return None

            # 1. Execute actual network check
            check_data = await execute_target_check(target)
            now = datetime.now(timezone.utc)

            # 2. Record PingResult
            ping_result = PingResult(
                target_id=target.id,
                timestamp=now,
                status=check_data["status"],
                latency_ms=check_data["latency_ms"],
                packet_loss=check_data["packet_loss"],
                response_code=check_data["response_code"],
                error_message=check_data["error_message"]
            )
            db.add(ping_result)

            # 3. State transition logic
            old_status = target.current_status
            target.last_checked_at = now

            is_check_successful = check_data["status"] == "UP"

            if is_check_successful:
                target.consecutive_successes += 1
                target.consecutive_failures = 0
                target.last_online_at = now

                # Check if recovery threshold reached
                if target.consecutive_successes >= target.recovery_threshold:
                    # Check latency classification for warning
                    lat = check_data["latency_ms"]
                    if lat and lat >= settings.LATENCY_WARNING_THRESHOLD:
                        new_status = "WARNING"
                    else:
                        new_status = "ONLINE"
                else:
                    new_status = target.current_status
            else:
                target.consecutive_failures += 1
                target.consecutive_successes = 0

                # Check if failure threshold reached
                if target.consecutive_failures >= target.failure_threshold:
                    new_status = "OFFLINE"
                    target.last_offline_at = now
                else:
                    new_status = "WARNING" if target.current_status == "ONLINE" else target.current_status

            status_changed = (old_status != new_status and new_status in ["ONLINE", "OFFLINE"])

            # 4. Handle Incident and Alert Lifecycles
            active_incident = None
            if new_status == "OFFLINE" and old_status != "OFFLINE":
                # Create Incident
                active_incident = Incident(
                    target_id=target.id,
                    started_at=now,
                    reason=check_data.get("error_message") or f"Check failed ({check_data['status']})",
                    status="OPEN"
                )
                db.add(active_incident)
                await db.flush()

                # Dispatch OFFLINE Alert
                await create_and_dispatch_alert(
                    db=db,
                    target=target,
                    alert_type="OFFLINE",
                    message=f"🚨 Monitor '{target.name}' ({target.host}) is OFFLINE! Reason: {active_incident.reason}",
                    incident=active_incident
                )

                # Broadcast incident creation
                await ws_manager.broadcast({
                    "type": "incident_created",
                    "incident": {
                        "id": active_incident.id,
                        "target_id": target.id,
                        "target_name": target.name,
                        "target_host": target.host,
                        "started_at": active_incident.started_at.isoformat(),
                        "reason": active_incident.reason,
                        "status": "OPEN"
                    }
                })

            elif new_status == "ONLINE" and old_status == "OFFLINE":
                # Resolve Open Incident
                inc_query = await db.execute(
                    select(Incident).where(
                        and_(Incident.target_id == target.id, Incident.status == "OPEN")
                    ).order_by(Incident.started_at.desc())
                )
                open_incident = inc_query.scalars().first()
                if open_incident:
                    open_incident.resolved_at = now
                    open_incident.duration_seconds = int((now - open_incident.started_at).total_seconds())
                    open_incident.status = "RESOLVED"
                    active_incident = open_incident

                    # Dispatch RECOVERED Alert
                    duration_str = f"{open_incident.duration_seconds // 60}m {open_incident.duration_seconds % 60}s"
                    await create_and_dispatch_alert(
                        db=db,
                        target=target,
                        alert_type="ONLINE",
                        message=f"✅ Monitor '{target.name}' ({target.host}) has RECOVERED! Downtime: {duration_str}",
                        incident=open_incident
                    )

                    await ws_manager.broadcast({
                        "type": "incident_resolved",
                        "incident": {
                            "id": open_incident.id,
                            "target_id": target.id,
                            "target_name": target.name,
                            "resolved_at": now.isoformat(),
                            "duration_seconds": open_incident.duration_seconds,
                            "status": "RESOLVED"
                        }
                    })

            # Check for High Latency or Packet Loss alerts during ONLINE state
            if is_check_successful and target.current_status == "ONLINE":
                lat = check_data.get("latency_ms")
                if lat and lat >= settings.LATENCY_CRITICAL_THRESHOLD:
                    await create_and_dispatch_alert(
                        db=db,
                        target=target,
                        alert_type="HIGH_LATENCY",
                        message=f"⚠️ High latency alert: '{target.name}' latency is {lat:.1f}ms (threshold: {settings.LATENCY_CRITICAL_THRESHOLD}ms)"
                    )

            target.current_status = new_status
            target.updated_at = now
            await db.commit()

            # 5. Broadcast real-time update to all WebSocket clients
            await ws_manager.broadcast({
                "type": "monitor_update",
                "target_id": target.id,
                "name": target.name,
                "host": target.host,
                "status": target.current_status,
                "latency_ms": check_data["latency_ms"],
                "packet_loss": check_data["packet_loss"],
                "response_code": check_data["response_code"],
                "error_message": check_data["error_message"],
                "timestamp": now.isoformat()
            })

            return check_data

    async def _cleanup_old_results(self):
        """Purges old ping results according to DATA_RETENTION_DAYS."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=settings.DATA_RETENTION_DAYS)
        async with AsyncSessionLocal() as db:
            try:
                stmt = delete(PingResult).where(PingResult.timestamp < cutoff)
                res = await db.execute(stmt)
                await db.commit()
                logger.info(f"RETENTION_PURGE: Deleted old ping results older than {settings.DATA_RETENTION_DAYS} days")
            except Exception as e:
                logger.error(f"Error during data retention cleanup: {e}")


monitoring_engine = MonitoringEngine()
