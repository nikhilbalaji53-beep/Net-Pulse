import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app, init_db_and_seed
from app.monitoring.engine import monitoring_engine


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    await init_db_and_seed()


@pytest.mark.asyncio
async def test_health():
    # Test health endpoint directly
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "monitoring_engine" in data
        assert "database" in data


@pytest.mark.asyncio
async def test_auth_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "email": "admin@netpulse.io",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "admin@netpulse.io"
        assert data["user"]["role"] == "Admin"


@pytest.mark.asyncio
async def test_monitors_crud_and_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_resp = await ac.post("/api/auth/login", json={
            "email": "admin@netpulse.io",
            "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a monitor
        create_resp = await ac.post("/api/monitors", headers=headers, json={
            "name": "Quad9 DNS Test",
            "host": "9.9.9.9",
            "monitoring_type": "ICMP",
            "environment": "Testing",
            "location": "Global",
            "interval_seconds": 30,
            "timeout_seconds": 5,
            "failure_threshold": 3,
            "recovery_threshold": 2
        })
        assert create_resp.status_code == 201
        target_id = create_resp.json()["id"]

        # 2. Get monitor
        get_resp = await ac.get(f"/api/monitors/{target_id}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Quad9 DNS Test"

        # 3. Manual check
        check_resp = await ac.post(f"/api/monitors/{target_id}/check", headers=headers)
        assert check_resp.status_code == 200

        # 4. Pause and Resume
        pause_resp = await ac.post(f"/api/monitors/{target_id}/pause", headers=headers)
        assert pause_resp.status_code == 200
        assert pause_resp.json()["current_status"] == "PAUSED"

        resume_resp = await ac.post(f"/api/monitors/{target_id}/resume", headers=headers)
        assert resume_resp.status_code == 200
        assert resume_resp.json()["enabled"] is True

        # 5. Delete monitor
        del_resp = await ac.delete(f"/api/monitors/{target_id}", headers=headers)
        assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_dashboard_stats():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_resp = await ac.post("/api/auth/login", json={
            "email": "admin@netpulse.io",
            "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        stats_resp = await ac.get("/api/dashboard/stats", headers=headers)
        assert stats_resp.status_code == 200
        data = stats_resp.json()
        assert "total_monitors" in data
        assert "online" in data
        assert "overall_uptime_percentage" in data
