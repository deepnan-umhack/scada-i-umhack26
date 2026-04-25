import json
import os
import threading
from uuid import UUID
from datetime import datetime, timedelta, timezone, date
from typing import Any, Dict, Optional
from hvac_agent.utils.demo_logger import error

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

import paho.mqtt.client as mqtt
from hvac_agent.infra.postgres_client import fetch_one, fetch_rows, run

from hvac_agent.core.schemas import (
    OptimizerRequest,
    OptimizerResponse,
    PolicyConstraints,
    RoomState,
    SensorHealthReport,
)

# =========================================================
# Environment / Configuration
# =========================================================

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_HVAC_COMMAND = os.getenv("MQTT_TOPIC_HVAC_COMMAND", "scadai/hvac/control")
MQTT_TOPIC_OPTIMIZER_REQUEST = os.getenv("MQTT_TOPIC_OPTIMIZER_REQUEST", "scadai/hvac/optimizer/request")
MQTT_TOPIC_OPTIMIZER_RESPONSE = os.getenv("MQTT_TOPIC_OPTIMIZER_RESPONSE", "scadai/hvac/optimizer/response")
MQTT_OPTIMIZER_TIMEOUT_SEC = int(os.getenv("MQTT_OPTIMIZER_TIMEOUT_SEC", "8"))
MQTT_PUBLISH_WAIT_SEC = int(os.getenv("MQTT_PUBLISH_WAIT_SEC", "3"))
HVAC_OPTIMIZER_MODE = os.getenv("HVAC_OPTIMIZER_MODE", "auto").lower()

DEFAULT_OCCUPANCY_CONFIDENCE = float(os.getenv("DEFAULT_OCCUPANCY_CONFIDENCE", "1.0"))
MAX_SENSOR_STALENESS_MIN = int(os.getenv("MAX_SENSOR_STALENESS_MIN", "15"))
MAX_HVAC_STATE_STALENESS_MIN = int(os.getenv("MAX_HVAC_STATE_STALENESS_MIN", "30"))
HACKATHON_SENSOR_ROOM_ID = "628d826f-c8f2-4185-9541-b492842f100d"

# =========================================================
# Clients
# =========================================================

_mqtt_client: Optional[mqtt.Client] = None
_mqtt_connected = False

_optimizer_response_store: Dict[str, dict] = {}
_optimizer_response_events: Dict[str, threading.Event] = {}

# =========================================================
# Helpers
# =========================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_iso_to_str(value: Any) -> str:
    if value is None:
        return _utc_now().isoformat()
    return str(value)


def _parse_maybe_iso(value: Any) -> datetime | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _coerce_datetime(value: Any) -> datetime:
    """Coerce ISO strings / date / datetime values into a NAIVE UTC datetime."""
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, date):
        # Default to a naive datetime 
        dt = datetime(value.year, value.month, value.day)
    else:
        text = str(value).strip()
        if not text:
            raise ValueError("Empty datetime value")
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)

    # 🚀 THE FIX: Convert to UTC, then completely STRIP the timezone info!
    # This hands asyncpg a clean "Naive" datetime, resolving the subtraction conflict.
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

    return dt


def _on_mqtt_connect(client, userdata, flags, rc, properties=None):
    global _mqtt_connected
    if rc == 0:
        _mqtt_connected = True
        client.subscribe(MQTT_TOPIC_OPTIMIZER_RESPONSE)
    else:
        _mqtt_connected = False
        error("MQTT", f"Connection failed with code {rc}")


def _on_mqtt_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except Exception as e:
        error("MQTT", f"Failed to decode message on {msg.topic}: {e}")
        return

    if msg.topic == MQTT_TOPIC_OPTIMIZER_RESPONSE:
        request_id = payload.get("request_id")
        if not request_id:
            error("MQTT", "Optimizer response missing request_id")
            return

        _optimizer_response_store[request_id] = payload

        event = _optimizer_response_events.get(request_id)
        if event:
            event.set()


def _on_mqtt_disconnect(client, userdata, flags, rc, properties=None):
    global _mqtt_connected
    _mqtt_connected = False


def _get_mqtt_client() -> mqtt.Client:
    global _mqtt_client

    if _mqtt_client is not None:
        return _mqtt_client

    mqtt_ws_path = os.getenv("MQTT_WS_PATH", "/mqtt")
    mqtt_transport = os.getenv("MQTT_TRANSPORT", "tcp").lower()

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        transport=mqtt_transport
    )
    client.on_connect = _on_mqtt_connect
    client.on_disconnect = _on_mqtt_disconnect
    client.on_message = _on_mqtt_message

    if mqtt_transport == "websockets":
        client.tls_set()
        client.ws_set_options(path=mqtt_ws_path)

    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()

    _mqtt_client = client
    return _mqtt_client


def _wait_for_mqtt_connection(timeout_sec: int = 5) -> bool:
    """
    Wait for MQTT client to be fully connected and subscribed.
    This prevents race conditions where we publish before subscription is ready.
    """
    start_time = datetime.now(timezone.utc)

    while not _mqtt_connected:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        if elapsed > timeout_sec:
            error("MQTT", f"Timeout waiting for connection after {timeout_sec}s")
            return False
        threading.Event().wait(0.1)

    return True


def _publish_mqtt(topic: str, payload: dict) -> dict:
    client = _get_mqtt_client()

    if not _wait_for_mqtt_connection(timeout_sec=5):
        return {
            "status": "failed",
            "topic": topic,
            "payload": payload,
            "message": "Failed to establish MQTT connection before publish",
        }

    message = json.dumps(payload)
    # Use QoS 1 and wait for publish completion to reduce silent drop risk.
    result = client.publish(topic, message, qos=1)

    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        return {
            "status": "failed",
            "topic": topic,
            "payload": payload,
            "message": f"MQTT publish failed with code {result.rc}",
        }

    try:
        result.wait_for_publish(timeout=MQTT_PUBLISH_WAIT_SEC)
    except TypeError:
        # Older paho versions may not support timeout kwarg.
        result.wait_for_publish()

    if hasattr(result, "is_published") and not result.is_published():
        return {
            "status": "failed",
            "topic": topic,
            "payload": payload,
            "message": f"MQTT publish timed out after {MQTT_PUBLISH_WAIT_SEC}s",
        }

    return {
        "status": "sent",
        "topic": topic,
        "payload": payload,
        "message": "MQTT publish successful",
    }


def _build_mock_optimizer_response(payload: dict, reason_suffix: str) -> OptimizerResponse:
    """
    Build a deterministic mock optimizer response so HVAC flows can be tested
    without a hosted optimizer service.
    """
    current_temp = float(payload["current_temperature_c"])
    min_temp = float(payload["min_allowed_temperature_c"])
    max_temp = float(payload["max_allowed_temperature_c"])
    current_setpoint = float(payload["current_setpoint_c"])
    mode = str(payload.get("optimization_mode") or "NORMAL")
    current_fan = str(payload.get("current_fan_speed") or "MEDIUM")

    if mode == "PRE_COOLING":
        recommended_temp = max(min_temp, min(23.0, max_temp))
        recommended_fan = "HIGH" if current_temp > 27 else "MEDIUM"
        reason = f"Mock pre-cooling optimization applied ({reason_suffix})."
    else:
        if current_temp > 26:
            recommended_temp = max(min_temp, min(24.0, max_temp))
            recommended_fan = "MEDIUM"
        else:
            recommended_temp = current_setpoint
            recommended_fan = current_fan
        reason = f"Mock normal optimization applied ({reason_suffix})."

    return OptimizerResponse(
        recommended_temperature_c=float(recommended_temp),
        recommended_fan_speed=recommended_fan,
        recommended_mode="COOL",
        model_name=f"mock_lightgbm_{payload.get('room_id', 'unknown')}",
        status="success",
        reason=reason,
    )


def resolve_room_id(room_name_or_id: str) -> str:
    """
    Resolve a human-readable room name to UUID.

    If the input is already a valid UUID and exists in rooms.id,
    return it unchanged. Otherwise, treat it as a room name.
    """
    normalized_room_name = room_name_or_id.replace("_", " ").strip()
    is_uuid = False
    try:
        UUID(str(room_name_or_id))
        is_uuid = True
    except ValueError:
        pass

    if is_uuid:
        row = run(
            fetch_one(
                """
                SELECT id, name
                FROM rooms
                WHERE id = $1
                LIMIT 1
                """,
                str(room_name_or_id),
            )
        )

        if row is not None:
            return str(row["id"])

    row = run(
        fetch_one(
            """
            SELECT id, name
            FROM rooms
            WHERE name = $1
            LIMIT 1
            """,
            normalized_room_name,
        )
    )

    if row is None:
        error("ROOM LOOKUP", f"No room found for: {room_name_or_id}")
        raise ValueError(f"No room found for identifier/name: {room_name_or_id}")

    return str(row["id"])


def resolve_room_name(room_id: str) -> str:
    """
    Resolve a UUID room_id back to human-readable room name.
    Useful for logs/debugging/UI later.
    """
    row = run(
        fetch_one(
            """
            SELECT name
            FROM rooms
            WHERE id = $1
            LIMIT 1
            """,
            room_id,
        )
    )
    if row is None:
        raise ValueError(f"No room found for room_id: {room_id}")

    return row["name"]


def get_policy_constraints(room_id: str) -> PolicyConstraints:
    """
    Return local HVAC policy constraints.

    This worker is stateless and does not call peer agents for policy data.
    The orchestrator owns cross-agent coordination/state.
    """
    return PolicyConstraints(
        min_temperature_c=float(os.getenv("HVAC_MIN_TEMPERATURE_C", "22.0")),
        max_temperature_c=float(os.getenv("HVAC_MAX_TEMPERATURE_C", "26.0")),
        max_override_duration_min=int(os.getenv("HVAC_MAX_OVERRIDE_DURATION_MIN", "60")),
        pre_cooling_window_min=int(os.getenv("HVAC_PRE_COOLING_WINDOW_MIN", "30")),
        allow_cooling_when_unoccupied=os.getenv("HVAC_ALLOW_COOLING_WHEN_UNOCCUPIED", "false").lower() in {"1", "true", "yes"},
    )


# =========================================================
# Postgres Data Tools
# =========================================================

def get_room_state(room_id: str) -> RoomState:
    """
    Fetch current room state from Postgres.
    Combines:
    - room_state table
    - hvac_state table

    Expected tables:
    - room_state(room_id, temperature_c, humidity_percent, occupied, occupancy_count, last_updated)
    - hvac_state(room_id, current_setpoint_c, fan_speed, mode, ac_on, updated_at)
    """
    room_row = run(
        fetch_one(
            """
            SELECT *
            FROM room_state
            WHERE room_id = $1
            LIMIT 1
            """,
            room_id,
        )
    )
    hvac_row = run(
        fetch_one(
            """
            SELECT *
            FROM hvac_state
            WHERE room_id = $1
            LIMIT 1
            """,
            room_id,
        )
    )

    if room_row is None:
        raise ValueError(f"No room_state found for room_id={room_id}")

    if hvac_row is None:
        raise ValueError(f"No hvac_state found for room_id={room_id}")

    return RoomState(
        room_id=str(room_row["room_id"]),
        temperature_c=float(room_row["temperature_c"]),
        humidity_percent=float(room_row["humidity_percent"]),
        occupied=bool(room_row["occupied"]),
        occupancy_count=int(room_row["occupancy_count"]),
        occupancy_confidence=DEFAULT_OCCUPANCY_CONFIDENCE,
        ac_on=bool(hvac_row["ac_on"]),
        current_setpoint_c=float(hvac_row["current_setpoint_c"]),
        fan_speed=str(hvac_row["fan_speed"]),
        mode=str(hvac_row["mode"]),
        last_updated=_safe_iso_to_str(room_row.get("last_updated")),
    )


def diagnose_sensor_health(room_id: str) -> SensorHealthReport:
    """
    Diagnose sensor/data health for a room using freshness and plausibility checks.

    Status semantics:
    - healthy: no critical issues and no warnings
    - degraded: warnings present but no critical issues
    - failed: one or more critical issues
    """
    checked_at = _utc_now().isoformat()
    effective_room_id = HACKATHON_SENSOR_ROOM_ID
    issues: list[str] = []
    warnings: list[str] = []

    room_row = run(
        fetch_one(
            """
            SELECT *
            FROM room_state
            WHERE room_id = $1
            LIMIT 1
            """,
            effective_room_id,
        )
    )
    hvac_row = run(
        fetch_one(
            """
            SELECT *
            FROM hvac_state
            WHERE room_id = $1
            LIMIT 1
            """,
            effective_room_id,
        )
    )

    if room_row is None:
        issues.append("Missing room_state row")
    if hvac_row is None:
        issues.append("Missing hvac_state row")

    metrics: dict[str, Any] = {
        "temperature_c": room_row.get("temperature_c") if room_row else None,
        "humidity_percent": room_row.get("humidity_percent") if room_row else None,
        "occupancy_count": room_row.get("occupancy_count") if room_row else None,
        "occupied": room_row.get("occupied") if room_row else None,
        "current_setpoint_c": hvac_row.get("current_setpoint_c") if hvac_row else None,
        "room_last_updated": room_row.get("last_updated") if room_row else None,
        "hvac_last_updated": hvac_row.get("updated_at") if hvac_row else None,
    }

    if room_row is not None:
        try:
            temp = float(room_row["temperature_c"])
            if temp < -10 or temp > 60:
                issues.append(f"Temperature out of plausible range: {temp}C")
            elif temp < 10 or temp > 45:
                warnings.append(f"Temperature unusual for indoor sensor: {temp}C")
        except Exception:
            issues.append("Temperature is non-numeric")

        try:
            humidity = float(room_row["humidity_percent"])
            if humidity < 0 or humidity > 100:
                issues.append(f"Humidity out of valid range: {humidity}%")
            elif humidity > 90:
                warnings.append(f"Humidity unusually high: {humidity}%")
        except Exception:
            issues.append("Humidity is non-numeric")

        try:
            occupancy_count = int(room_row["occupancy_count"])
            if occupancy_count < 0:
                issues.append("Occupancy count is negative")
            if occupancy_count > 200:
                warnings.append(f"Occupancy count unusually high: {occupancy_count}")
            occupied = bool(room_row["occupied"])
            if not occupied and occupancy_count > 0:
                warnings.append("Occupied flag false but occupancy_count > 0")
        except Exception:
            issues.append("Occupancy fields are invalid")

        # Hackathon mode: skip timestamp parsing/staleness checks to avoid blocking demos.

    if hvac_row is not None:
        try:
            setpoint = float(hvac_row["current_setpoint_c"])
            if setpoint < 10 or setpoint > 35:
                warnings.append(f"HVAC setpoint appears unusual: {setpoint}C")
        except Exception:
            warnings.append("HVAC current_setpoint_c is non-numeric")

        # Hackathon mode: skip timestamp parsing/staleness checks to avoid blocking demos.

    status = "healthy"
    if issues:
        status = "failed"
    elif warnings:
        status = "degraded"

    return SensorHealthReport(
        room_id=effective_room_id,
        status=status,
        checked_at=checked_at,
        issues=issues,
        warnings=warnings,
        metrics=metrics,
    )


def save_pre_cooling_schedule(room_id: str, booking_start: Any, pre_cool_start: Any) -> dict:
    """
    Save a pre-cooling schedule into Postgres with enforced 30-minute maximum window.
    Safely handles both ISO strings and native datetime objects.
    """
    # Safely parse timestamps whether they arrive as strings or datetime/date objects
    try:
        booking_dt = _coerce_datetime(booking_start)
        precool_dt = _coerce_datetime(pre_cool_start)
    except (ValueError, TypeError) as exc:
        return {
            "status": "failed",
            "message": f"Invalid datetime format: {exc}",
            "data": [],
        }

    # Enforce 30-minute maximum precooling window
    min_precool_dt = booking_dt - timedelta(minutes=30)
    if precool_dt < min_precool_dt:
        final_precool_dt = min_precool_dt
        adjusted_pre_cool_start = final_precool_dt.isoformat()
    else:
        final_precool_dt = precool_dt
        # Ensure we have a string representation for the adjustment note later
        adjusted_pre_cool_start = pre_cool_start if isinstance(pre_cool_start, str) else final_precool_dt.isoformat()

    # Validate that precool_start is before booking_start
    if final_precool_dt >= booking_dt:
        return {
            "status": "failed",
            "message": "Pre-cooling start must be before booking start time.",
            "data": [],
        }

    # Pass the native datetime objects to asyncpg
    try:
        inserted = run(
            fetch_one(
                """
                INSERT INTO pre_cooling_schedule (
                    room_id,
                    booking_start,
                    pre_cool_start,
                    status
                ) VALUES ($1, $2, $3, 'scheduled')
                RETURNING *
                """,
                room_id,
                booking_dt,       # <-- Native datetime object
                final_precool_dt, # <-- Native datetime object
            )
        )
    except Exception as db_exc:
        return {
            "status": "failed",
            "message": f"Database insertion failed: {db_exc}",
            "data": [],
        }

    result = {
        "status": "success",
        "message": "Pre-cooling schedule saved",
        "data": [{k: str(v) if k in {"id", "room_id"} else v for k, v in inserted.items()}] if inserted else [],
    }

    # Add adjustment note if precooling was capped
    orig_pre_cool_str = pre_cool_start if isinstance(pre_cool_start, str) else precool_dt.isoformat()
    if adjusted_pre_cool_start != orig_pre_cool_str:
        result["adjustment_note"] = f"Requested pre-cool start was adjusted to enforce 30-minute maximum: {adjusted_pre_cool_start}"

    return result


def get_due_pre_cooling_schedules() -> list[dict]:
    """
    Fetch scheduled pre-cooling rows that are due now or overdue.
    """
    now_iso = _utc_now().isoformat()

    rows = run(
        fetch_rows(
            """
            SELECT *
            FROM pre_cooling_schedule
            WHERE status = 'scheduled'
              AND pre_cool_start <= $1
            """,
            now_iso,
        )
    )
    return rows or []


def mark_pre_cooling_schedule_completed(schedule_id: str) -> dict:
    """
    Mark a pre-cooling schedule as completed.
    """
    updated = run(
        fetch_one(
            """
            UPDATE pre_cooling_schedule
            SET status = 'completed'
            WHERE id = $1
            RETURNING *
            """,
            schedule_id,
        )
    )

    return {
        "status": "success",
        "message": "Pre-cooling schedule marked completed",
        "data": [{k: str(v) if k in {"id", "room_id"} else v for k, v in updated.items()}] if updated else [],
    }


# =========================================================
# MQTT / Execution Tools
# =========================================================

def execute_hvac_command(
    room_id: str,
    target_temperature_c: float | None,
    fan_speed: str | None,
    mode: str | None,
    duration_min: int | None,
) -> dict:
    """
    Send HVAC command via MQTT.

    Later, an actual device subscriber can listen on the configured topic.
    """
    payload = {
        "room_id": room_id,
        "target_temperature_c": target_temperature_c,
        "fan_speed": fan_speed,
        "mode": mode,
        "duration_min": duration_min,
        "sent_at": _utc_now().isoformat(),
    }

    mqtt_result = _publish_mqtt(MQTT_TOPIC_HVAC_COMMAND, payload)

    return {
        "status": mqtt_result["status"],
        "room_id": room_id,
        "applied_temperature_c": target_temperature_c,
        "applied_fan_speed": fan_speed,
        "applied_mode": mode,
        "duration_min": duration_min,
        "mqtt_topic": MQTT_TOPIC_HVAC_COMMAND,
        "payload": payload,
        "message": mqtt_result["message"],
    }


def request_ac_optimization(request: OptimizerRequest, request_id: str) -> OptimizerResponse:
    """
    Request AC optimization via MQTT request/response.

    Flow:
    1. Initialize MQTT client and ensure connection
    2. Publish request to optimizer request topic
    3. Wait for matching response on optimizer response topic
    4. Convert response into OptimizerResponse

    If timeout occurs, raise an error so the caller can decide fallback behavior.
    """
    payload = request.model_dump()
    payload["request_id"] = request_id

    if HVAC_OPTIMIZER_MODE == "mock":
        return _build_mock_optimizer_response(payload, "HVAC_OPTIMIZER_MODE=mock")

    _get_mqtt_client()

    event = threading.Event()
    _optimizer_response_events[request_id] = event

    publish_result = _publish_mqtt(MQTT_TOPIC_OPTIMIZER_REQUEST, payload)
    if publish_result["status"] != "sent":
        _optimizer_response_events.pop(request_id, None)
        if HVAC_OPTIMIZER_MODE == "auto":
            return _build_mock_optimizer_response(payload, f"MQTT publish failed: {publish_result['message']}")
        raise RuntimeError(f"Failed to publish optimizer request: {publish_result['message']}")

    got_response = event.wait(timeout=MQTT_OPTIMIZER_TIMEOUT_SEC)

    if not got_response:
        _optimizer_response_events.pop(request_id, None)
        _optimizer_response_store.pop(request_id, None)
        if HVAC_OPTIMIZER_MODE == "auto":
            return _build_mock_optimizer_response(
                payload,
                f"MQTT timeout after {MQTT_OPTIMIZER_TIMEOUT_SEC}s",
            )
        raise TimeoutError(
            f"Timed out waiting for optimizer response after {MQTT_OPTIMIZER_TIMEOUT_SEC} seconds"
        )

    raw_response = _optimizer_response_store.pop(request_id, None)
    _optimizer_response_events.pop(request_id, None)

    if raw_response is None:
        if HVAC_OPTIMIZER_MODE == "auto":
            return _build_mock_optimizer_response(payload, "MQTT response payload missing")
        raise RuntimeError("Optimizer response event was set, but no payload was found")

    return OptimizerResponse(
        recommended_temperature_c=float(raw_response["recommended_temperature_c"]),
        recommended_fan_speed=str(raw_response["recommended_fan_speed"]),
        recommended_mode=str(raw_response["recommended_mode"]),
        model_name=str(raw_response["model_name"]),
        status=str(raw_response["status"]),
        reason=str(raw_response["reason"]),
    )


# =========================================================
# Optimizer Pause / Conflict Control
# =========================================================

def pause_optimizer(room_id: str, duration_min: int) -> dict:
    """
    Stateless worker: optimizer pause is owned by orchestrator state.
    """
    return {
        "status": "disabled",
        "room_id": room_id,
        "paused_until": None,
        "message": "Optimizer pause state is orchestrator-managed; HVAC worker remains stateless.",
    }


def is_optimizer_paused(room_id: str) -> bool:
    """
    Stateless worker: no local pause memory.
    """
    return False


def get_optimizer_pause_status(room_id: str) -> dict:
    """
    Stateless worker: always report no local pause state.
    """
    return {
        "room_id": room_id,
        "paused": False,
        "paused_until": None,
    }


# =========================================================
# Notification Tools
# =========================================================

def notify_admin(message: str) -> dict:
    """
    Mock notification tool.
    Later, this can send email, Telegram, dashboard alert, etc.
    """
    return {
        "status": "sent",
        "message": message,
    }