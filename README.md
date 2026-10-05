# NetPulse — Intelligent Ping Monitoring System

> **“Monitor. Detect. Respond.”**

NetPulse is a complete, production-grade, web-based network and infrastructure monitoring platform. It continuously checks whether registered servers, websites, routers, IP addresses, APIs, and microservices are reachable in real time.

All monitoring results reflect **actual network operations** (ICMP Ping, TCP Socket Connect, HTTP/HTTPS Requests, and Hostname DNS queries) — zero simulated or fake metrics.

---

## 🌟 Key Features

* **Real Probing Engine**: 
  * **ICMP Ping**: Safe cross-platform subprocess execution capturing RTT latency, packet loss percentage, timeout detection, and network error classification.
  * **TCP Port Monitoring**: Asynchronous 3-way handshake checking service availability on ports 22, 80, 443, 3306, 5432, 8080, etc.
  * **HTTP / HTTPS Probing**: Real HTTP GET requests measuring status codes, SSL validity, and response latencies.
  * **Hostname / DNS Checks**: DNS resolution confirmation + reachability verification.
* **Intelligent Outage & Incident Lifecycle**:
  * Configurable consecutive failure threshold (e.g. 3 failures before declaring OFFLINE to prevent false alarms).
  * Configurable consecutive recovery threshold (e.g. 2 successes before declaring ONLINE).
  * Automatic incident creation upon outage and resolution tracking with calculated downtime duration.
* **Real-Time WebSocket Updates**:
  * Instant status broadcasts to all connected clients without page reloads.
  * Native Web Browser Notifications API support with audio-visual cues.
* **Analytics, Charts & Reporting**:
  * Real-time Interactive Recharts Latency graphs with range toggles (1h, 6h, 24h, 7d).
  * 24-hour visual availability timeline bars with hover tooltips.
  * Calculated SLA uptime compliance percentages across 1h, 24h, 7d, and 30d periods.
  * Historical SLA reports with one-click RFC 4180 CSV export.
* **Robust Enterprise Security**:
  * Argon2/Bcrypt password hashing, JWT Bearer authentication, Role-Based Access Control (`Admin` vs `Viewer`).
  * Command injection prevention with strict argument vector passing (no `shell=True`).
  * Host/URL regex validation and SSRF filtering for sensitive metadata ranges.
  * Complete administrative audit trail recording all target changes and authentication attempts.
* **Performance & Data Retention**:
  * Configurable automatic pruning of historical ping records (7 to 365 days) ensuring database speed.

---

## 📐 System Architecture

```
React (Vite + Tailwind CSS + Recharts)
              ↕  [REST API / WebSocket Stream]
FastAPI Application Server (Python 3.13)
              ↕
Async Monitoring Engine & Checkers (ICMP / TCP / HTTP / DNS)
              ↕
SQLAlchemy ORM (PostgreSQL / SQLite with aiosqlite)
              ↕
Alert Engine (Browser Notifications / WebSocket / SMTP Email)
```

---

## 📁 Project Structure

```
Net Pulse/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (auth, monitors, incidents, alerts, stats, reports, audit)
│   │   ├── models/          # SQLAlchemy async models (User, Target, PingResult, Incident, Alert, AuditLog)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Business logic (statistics, SLA reports, audit logging)
│   │   ├── monitoring/      # Network checkers (ICMP, TCP, HTTP, Hostname) & Async Engine
│   │   ├── alerts/          # Alert dispatcher & SMTP email notifier
│   │   ├── database/        # Async engine & session management
│   │   ├── websocket/       # WebSocket connection manager & live broadcaster
│   │   ├── security/        # JWT tokens, Bcrypt hashing, SSRF guards, RBAC dependencies
│   │   ├── config.py        # Settings & environment parameters
│   │   └── main.py          # FastAPI application entry point, lifecycle, and seed data
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Navbar, StatusBadge, StatCard, AddMonitorModal)
│   │   ├── pages/           # Pages (Dashboard, Monitors, MonitorDetail, Incidents, Alerts, Reports, Settings, Auth)
│   │   ├── layouts/         # Layouts (AppLayout with live alert toast banners)
│   │   ├── hooks/           # useWebSocket hook with auto-reconnection
│   │   ├── services/        # Axios API client
│   │   ├── utils/           # Time, latency, uptime, duration formatting utilities
│   │   ├── charts/          # LatencyChart (Recharts Area), AvailabilityTimeline
│   │   ├── context/         # AuthContext with token persistence and demo admin helper
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── tests/
│   └── test_backend.py      # Automated pytest suite
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* (Optional) Docker & Docker Compose

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

On initial startup, NetPulse automatically:
* Creates database tables in SQLite (`netpulse.db`) or PostgreSQL.
* Seeds the initial default administrator:
  * **Email**: `admin@netpulse.io`
  * **Password**: `admin123`
* Seeds real default probe targets (`8.8.8.8`, `1.1.1.1`, `google.com`).

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser. You can click **"Quick Demo Login"** on the login page to immediately sign in as the administrator!

---

## 🐳 Docker Deployment

To launch the full stack (PostgreSQL + Backend + Frontend via Nginx):

```bash
docker compose up -d --build
```

Access:
* **Frontend Dashboard**: `http://localhost:3000`
* **Backend API Docs**: `http://localhost:8000/docs`
* **Health Check**: `http://localhost:8000/health`

---

## 🧪 Running Automated Tests

Run the backend test suite:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest ..\tests\test_backend.py -v
```

All tests verify authentication, token generation, target creation, manual check triggering, pause/resume lifecycles, and dashboard aggregations.

---

## 🛡️ Security Architecture

1. **Subprocess Isolation**: Pings are executed strictly via `asyncio.create_subprocess_exec` passing split argument arrays. Shell interpretation (`shell=True`) is never permitted.
2. **SSRF Guard**: Prohibits requests against link-local addresses (`169.254.169.254`) and allows fine-grained toggling of internal private networks.
3. **Role-Based Access Control**:
   * `Admin`: Full CRUD on monitoring targets, manual check triggers, pause/resume, and system settings modifications.
   * `Viewer`: Read-only access to live dashboards, SLA reports, incidents, and alerts.
4. **Audit Trail**: Every target modification, pause/resume event, and authentication attempt is stored with client IP in the `audit_logs` table.

---

## 📄 License
Licensed under the MIT License. NetPulse &copy; 2026.
