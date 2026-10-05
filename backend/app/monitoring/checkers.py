import asyncio
import platform
import re
import socket
import time
from typing import Dict, Any, Optional
import httpx

from app.security.security import validate_safe_host_string, is_ip_allowed
from app.config import settings


async def check_icmp_ping(host: str, timeout_seconds: int = 5) -> Dict[str, Any]:
    """
    Executes a real ICMP ping command safely using subprocess without shell=True.
    Parses actual latency and packet loss.
    """
    clean_host = validate_safe_host_string(host)
    is_windows = platform.system().lower() == "windows"
    timeout_ms = int(timeout_seconds * 1000)

    # Cross-platform ping arguments
    if is_windows:
        cmd = ["ping", "-n", "1", "-w", str(timeout_ms), clean_host]
    else:
        cmd = ["ping", "-c", "1", "-W", str(timeout_seconds), clean_host]

    start_time = time.perf_counter()
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout_seconds + 2.0
            )
        except asyncio.TimeoutError:
            try:
                process.kill()
            except Exception:
                pass
            return {
                "status": "TIMEOUT",
                "latency_ms": None,
                "packet_loss": 100.0,
                "response_code": None,
                "error_message": f"Ping timed out after {timeout_seconds}s"
            }

        elapsed_total = (time.perf_counter() - start_time) * 1000.0
        stdout_text = stdout_bytes.decode(errors="replace")
        stderr_text = stderr_bytes.decode(errors="replace")

        if process.returncode == 0:
            # Parse round-trip latency
            latency_ms = None
            if is_windows:
                # Windows formats: "time=24ms", "time<1ms", "Average = 24ms"
                match = re.search(r"time[=<]([0-9]+)\s*ms", stdout_text, re.IGNORECASE)
                if match:
                    latency_ms = float(match.group(1))
                else:
                    avg_match = re.search(r"Average\s*=\s*([0-9]+)\s*ms", stdout_text, re.IGNORECASE)
                    if avg_match:
                        latency_ms = float(avg_match.group(1))
            else:
                # Linux/macOS formats: "time=24.1 ms" or "rtt min/avg/max/mdev = .../.../24.1/..."
                match = re.search(r"time=([0-9.]+)\s*ms", stdout_text)
                if match:
                    latency_ms = float(match.group(1))
                else:
                    rtt_match = re.search(r"rtt min/avg/max/mdev = [0-9.]+/([0-9.]+)/", stdout_text)
                    if rtt_match:
                        latency_ms = float(rtt_match.group(1))

            if latency_ms is None:
                # Fallback to elapsed time if ping succeeded but regex didn't match localized string
                latency_ms = round(elapsed_total, 2)

            return {
                "status": "UP",
                "latency_ms": round(latency_ms, 2),
                "packet_loss": 0.0,
                "response_code": 0,
                "error_message": None
            }
        else:
            # Check reasons for failure
            lowered = stdout_text.lower()
            if "timed out" in lowered or "request timed out" in lowered:
                err = "Request timed out"
                status = "TIMEOUT"
            elif "unreachable" in lowered:
                err = "Destination host unreachable"
                status = "DOWN"
            elif "could not find host" in lowered or "unknown host" in lowered:
                err = "Could not resolve hostname"
                status = "ERROR"
            else:
                err = stderr_text.strip() or stdout_text.strip() or "Ping packet dropped"
                status = "DOWN"

            return {
                "status": status,
                "latency_ms": None,
                "packet_loss": 100.0,
                "response_code": process.returncode,
                "error_message": err[:250]
            }

    except Exception as e:
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": str(e)[:250]
        }


async def check_tcp_port(host: str, port: int, timeout_seconds: int = 5) -> Dict[str, Any]:
    """
    Performs real TCP 3-way handshake connection check to the specified host and port.
    Measures connect round trip latency in milliseconds.
    """
    clean_host = validate_safe_host_string(host)
    if not (1 <= port <= 65535):
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"Invalid TCP port: {port}"
        }

    start_time = time.perf_counter()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(clean_host, port),
            timeout=timeout_seconds
        )
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass

        return {
            "status": "UP",
            "latency_ms": round(latency_ms, 2),
            "packet_loss": 0.0,
            "response_code": 200,
            "error_message": None
        }
    except asyncio.TimeoutError:
        return {
            "status": "TIMEOUT",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"TCP connection to port {port} timed out after {timeout_seconds}s"
        }
    except ConnectionRefusedError:
        return {
            "status": "DOWN",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"TCP connection refused on port {port}"
        }
    except socket.gaierror as e:
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"DNS resolution failed: {e}"
        }
    except Exception as e:
        return {
            "status": "DOWN",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"TCP connection error: {str(e)}"[:250]
        }


async def check_http(url: str, timeout_seconds: int = 5) -> Dict[str, Any]:
    """
    Performs real HTTP/HTTPS request, measures actual response time,
    captures HTTP status code, SSL validity, and connection errors.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=True,
            verify=True
        ) as client:
            response = await client.get(url)
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            
            # HTTP status >= 500 is treated as DOWN, 4xx as WARNING/DOWN depending on policy
            # Standard monitoring treats 2xx/3xx as UP, 4xx as WARNING/UP, 5xx as DOWN
            status = "UP" if response.status_code < 500 else "DOWN"
            err = None
            if response.status_code >= 400:
                err = f"HTTP {response.status_code} {response.reason_phrase}"

            return {
                "status": status,
                "latency_ms": round(latency_ms, 2),
                "packet_loss": 0.0 if status == "UP" else 50.0,
                "response_code": response.status_code,
                "error_message": err
            }
    except httpx.ConnectTimeout:
        return {
            "status": "TIMEOUT",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"HTTP connect timeout after {timeout_seconds}s"
        }
    except httpx.ReadTimeout:
        return {
            "status": "TIMEOUT",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"HTTP read timeout after {timeout_seconds}s"
        }
    except httpx.ConnectError as e:
        return {
            "status": "DOWN",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"HTTP connect error: {str(e)}"[:250]
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"HTTP request error: {str(e)}"[:250]
        }


async def check_hostname(host: str, timeout_seconds: int = 5) -> Dict[str, Any]:
    """
    Performs real DNS resolution and ping check to verify hostname reachability.
    """
    clean_host = validate_safe_host_string(host)
    loop = asyncio.get_event_loop()
    start_time = time.perf_counter()

    try:
        # Resolve hostname via DNS
        addr_info = await asyncio.wait_for(
            loop.getaddrinfo(clean_host, None),
            timeout=timeout_seconds
        )
        resolved_ip = addr_info[0][4][0]
        dns_latency = (time.perf_counter() - start_time) * 1000.0

        # Now ping the resolved IP / host
        ping_res = await check_icmp_ping(clean_host, timeout_seconds=timeout_seconds)
        if ping_res["status"] == "UP":
            return {
                "status": "UP",
                "latency_ms": ping_res["latency_ms"],
                "packet_loss": 0.0,
                "response_code": 0,
                "error_message": f"Resolved: {resolved_ip}"
            }
        else:
            return {
                "status": ping_res["status"],
                "latency_ms": None,
                "packet_loss": 100.0,
                "response_code": None,
                "error_message": f"Resolved to {resolved_ip} but unreachable: {ping_res.get('error_message')}"
            }

    except asyncio.TimeoutError:
        return {
            "status": "TIMEOUT",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"DNS resolution timed out after {timeout_seconds}s"
        }
    except socket.gaierror as e:
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": f"Hostname cannot be resolved: {e}"
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "latency_ms": None,
            "packet_loss": 100.0,
            "response_code": None,
            "error_message": str(e)[:250]
        }


async def execute_target_check(target) -> Dict[str, Any]:
    """
    Dispatches to appropriate real network check based on target monitoring_type.
    """
    m_type = (target.monitoring_type or "ICMP").upper()
    timeout = target.timeout_seconds or settings.DEFAULT_TIMEOUT

    if m_type == "ICMP":
        return await check_icmp_ping(target.host, timeout_seconds=timeout)
    elif m_type == "TCP":
        port = target.port or 80
        return await check_tcp_port(target.host, port=port, timeout_seconds=timeout)
    elif m_type == "HTTP":
        url = target.url or (f"http://{target.host}" if not target.host.startswith("http") else target.host)
        return await check_http(url, timeout_seconds=timeout)
    elif m_type == "HOSTNAME":
        return await check_hostname(target.host, timeout_seconds=timeout)
    else:
        # Default to ICMP
        return await check_icmp_ping(target.host, timeout_seconds=timeout)
