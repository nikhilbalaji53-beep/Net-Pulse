import io
import csv
from datetime import datetime, timezone
from typing import List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.target import MonitoredTarget
from app.models.result import PingResult
from app.models.incident import Incident
from app.schemas.report import ReportResponse, ReportSummary


async def generate_report_data(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime
) -> ReportResponse:
    targets_q = await db.execute(select(MonitoredTarget))
    targets = targets_q.scalars().all()

    target_summaries: List[ReportSummary] = []
    total_successful_all = 0
    total_checks_all = 0

    for target in targets:
        # Check results in range
        checks_q = await db.execute(
            select(
                func.count(PingResult.id),
                func.avg(PingResult.latency_ms),
                func.max(PingResult.latency_ms),
                func.min(PingResult.latency_ms),
                func.avg(PingResult.packet_loss)
            ).where(
                and_(
                    PingResult.target_id == target.id,
                    PingResult.timestamp >= start_date,
                    PingResult.timestamp <= end_date
                )
            )
        )
        total_checks, avg_lat, max_lat, min_lat, avg_loss = checks_q.one()
        total_checks = total_checks or 0

        succ_q = await db.execute(
            select(func.count(PingResult.id)).where(
                and_(
                    PingResult.target_id == target.id,
                    PingResult.timestamp >= start_date,
                    PingResult.timestamp <= end_date,
                    PingResult.status == "UP"
                )
            )
        )
        successful_checks = succ_q.scalar() or 0
        failed_checks = total_checks - successful_checks

        uptime_pct = round((successful_checks / total_checks) * 100.0, 2) if total_checks > 0 else 100.0

        # Incidents during this time
        inc_q = await db.execute(
            select(func.count(Incident.id), func.sum(Incident.duration_seconds)).where(
                and_(
                    Incident.target_id == target.id,
                    Incident.started_at >= start_date,
                    Incident.started_at <= end_date
                )
            )
        )
        inc_count, total_duration = inc_q.one()
        inc_count = inc_count or 0
        downtime_minutes = round((total_duration or 0) / 60.0, 2)

        total_checks_all += total_checks
        total_successful_all += successful_checks

        target_summaries.append(ReportSummary(
            target_id=target.id,
            target_name=target.name,
            target_host=target.host,
            monitoring_type=target.monitoring_type,
            environment=target.environment,
            total_checks=total_checks,
            successful_checks=successful_checks,
            failed_checks=failed_checks,
            uptime_percentage=uptime_pct,
            downtime_minutes=downtime_minutes,
            avg_latency_ms=round(avg_lat, 2) if avg_lat is not None else None,
            max_latency_ms=round(max_lat, 2) if max_lat is not None else None,
            min_latency_ms=round(min_lat, 2) if min_lat is not None else None,
            avg_packet_loss=round(avg_loss or 0.0, 2),
            incident_count=inc_count
        ))

    overall_uptime = round((total_successful_all / total_checks_all) * 100.0, 2) if total_checks_all > 0 else 100.0
    total_incidents = sum(ts.incident_count for ts in target_summaries)

    return ReportResponse(
        generated_at=datetime.now(timezone.utc),
        start_date=start_date,
        end_date=end_date,
        overall_uptime_percentage=overall_uptime,
        total_incidents=total_incidents,
        targets=target_summaries
    )


def export_report_csv(report: ReportResponse) -> str:
    """Generates RFC 4180 CSV string for report download."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["NetPulse Monitoring Report"])
    writer.writerow(["Generated At", report.generated_at.isoformat()])
    writer.writerow(["Period Start", report.start_date.isoformat()])
    writer.writerow(["Period End", report.end_date.isoformat()])
    writer.writerow(["Overall Uptime %", f"{report.overall_uptime_percentage}%"])
    writer.writerow(["Total Incidents", report.total_incidents])
    writer.writerow([])

    # Table columns
    writer.writerow([
        "Target Name",
        "Host",
        "Type",
        "Environment",
        "Total Checks",
        "Successful Checks",
        "Failed Checks",
        "Uptime %",
        "Downtime (min)",
        "Avg Latency (ms)",
        "Max Latency (ms)",
        "Min Latency (ms)",
        "Avg Packet Loss %",
        "Incidents"
    ])

    for t in report.targets:
        writer.writerow([
            t.target_name,
            t.target_host,
            t.monitoring_type,
            t.environment,
            t.total_checks,
            t.successful_checks,
            t.failed_checks,
            f"{t.uptime_percentage}%",
            t.downtime_minutes,
            t.avg_latency_ms if t.avg_latency_ms is not None else "N/A",
            t.max_latency_ms if t.max_latency_ms is not None else "N/A",
            t.min_latency_ms if t.min_latency_ms is not None else "N/A",
            f"{t.avg_packet_loss}%",
            t.incident_count
        ])

    return output.getvalue()
