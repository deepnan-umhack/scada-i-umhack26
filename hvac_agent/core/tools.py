import json
import os
import threading
from uuid import UUID
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from utils.demo_logger import error

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

import paho.mqtt.client as mqtt
from supabase import Client, create_client

from core.adapters import adapt_booking_data, adapt_policy_data
from core.schemas import (
    BookingContext,
    OptimizerRequest,
    OptimizerResponse,
    PolicyConstraints,
    RoomState,
)

# =========================================================
# Environment / Configuration
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_HVAC_COMMAND = os.getenv("MQTT_TOPIC_HVAC_COMMAND", "scadai/hvac/control")
MQTT_TOPIC_OPTIMIZER_REQUEST = os.getenv("MQTT_TOPIC_OPTIMIZER_REQUEST", "scadai/hvac/optimizer/request")
MQTT_TOPIC_OPTIMIZER_RESPONSE = os.getenv("MQTT_TOPIC_OPTIMIZER_RESPONSE", "scadai/hvac/optimizer/response")
MQTT_OPTIMIZER_TIMEOUT_SEC = int(os.getenv("MQTT_OPTIMIZER_TIMEOUT_SEC", "8"))

DEFAULT_OCCUPANCY_CONFIDENCE = float(os.getenv("DEFAULT_OCCUPANCY_CONFIDENCE", "1.0"))

# =========================================================
# Clients
# =========================================================

_supabase: Optional[Client] = None
_mqtt_client: Optional[mqtt.Client] = None
_mqtt_connected = False

# Mock in-memory optimizer pause state per room
optimizer_pause_state: Dict[str, datetime] = {}
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


def _require_supabase() -> Client:
    global _supabase

    if _supabase is not None:
        return _supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY."
        )

    _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


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
    mqtt_transport = os.getenv("MQTT_TRANSPORT", "websockets").lower()

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
    result = client.publish(topic, message)

    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        return {
            "status": "failed",
            "topic": topic,
            "payload": payload,
            "message": f"MQTT publish failed with code {result.rc}",
        }

    return {
        "status": "sent",
        "topic": topic,
        "payload": payload,
        "message": "MQTT publish successful",
    }


def _get_single_row_or_none(response) -> Optional[dict]:
    data = getattr(response, "data", None)
    if not data:
        return None
    return data[0]


def resolve_room_id(room_name_or_id: str) -> str:
    """
    Resolve a human-readable room name to UUID.

    If the input is already a valid UUID and exists in rooms.id,
    return it unchanged. Otherwise, treat it as a room name.
    """
    supabase = _require_supabase()

    is_uuid = False
    try:
        UUID(str(room_name_or_id))
        is_uuid = True
    except ValueError:
        pass

    if is_uuid:
        response = (
            supabase.table("rooms")
            .select("id,name")
            .eq("id", room_name_or_id)
            .limit(1)
            .execute()
        )
        row = _get_single_row_or_none(response)

        if row is not None:
            return row["id"]

    response = (
        supabase.table("rooms")
        .select("id,name")
        .eq("name", room_name_or_id)
        .limit(1)
        .execute()
    )
    row = _get_single_row_or_none(response)

    if row is None:
        error("ROOM LOOKUP", f"No room found for: {room_name_or_id}")
        raise ValueError(f"No room found for identifier/name: {room_name_or_id}")

    return row["id"]


def resolve_room_name(room_id: str) -> str:
    """
    Resolve a UUID room_id back to human-readable room name.
    Useful for logs/debugging/UI later.
    """
    supabase = _require_supabase()

    response = (
        supabase.table("rooms")
        .select("name")
        .eq("id", room_id)
        .limit(1)
        .execute()
    )
    row = _get_single_row_or_none(response)
    if row is None:
        raise ValueError(f"No room found for room_id: {room_id}")

    return row["name"]


# =========================================================
# External Agent Fetchers (Mock / Replace Later)
# =========================================================

def fetch_booking_agent_output(room_id: str) -> dict:
    """
    Mock external Booking Agent response.
    Replace later with orchestrator/API call.
    """
    return {
        "booked_now": False,
        "start_time": "2026-04-19T14:00:00",
        "end_time": "2026-04-19T15:00:00",
        "time_to_start": 20,
        "title": "Team Strategy Meeting",
    }


def fetch_esg_agent_output(room_id: str) -> dict:
    """
    Mock external ESG Agent response.
    Replace later with orchestrator/API call.
    """
    return {
        "min_temp": 22.0,
        "max_temp": 26.0,
        "override_duration_min": 60,
        "pre_cool_window_min": 30,
        "cool_when_unoccupied": False,
    }


# =========================================================
# Adapter-backed Integration Tools
# =========================================================

def get_booking_context(room_id: str) -> BookingContext:
    """
    Fetch booking data from external Booking Agent and adapt it into internal schema.
    """
    raw_booking = fetch_booking_agent_output(room_id)
    return adapt_booking_data(raw_booking)


def get_policy_constraints(room_id: str) -> PolicyConstraints:
    """
    Fetch ESG/policy data from external ESG Agent and adapt it into internal schema.
    """
    raw_policy = fetch_esg_agent_output(room_id)
    return adapt_policy_data(raw_policy)


# =========================================================
# Supabase Data Tools
# =========================================================

def get_room_state(room_id: str) -> RoomState:
    """
    Fetch current room state from Supabase.
    Combines:
    - room_state table
    - hvac_state table

    Expected tables:
    - room_state(room_id, temperature_c, humidity_percent, occupied, occupancy_count, last_updated)
    - hvac_state(room_id, current_setpoint_c, fan_speed, mode, ac_on, updated_at)
    """
    supabase = _require_supabase()

    room_response = supabase.table("room_state").select("*").eq("room_id", room_id).execute()
    hvac_response = supabase.table("hvac_state").select("*").eq("room_id", room_id).execute()

    room_row = _get_single_row_or_none(room_response)
    hvac_row = _get_single_row_or_none(hvac_response)

    if room_row is None:
        raise ValueError(f"No room_state found for room_id={room_id}")

    if hvac_row is None:
        raise ValueError(f"No hvac_state found for room_id={room_id}")

    return RoomState(
        room_id=room_row["room_id"],
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


def save_pre_cooling_schedule(room_id: str, booking_start: str, pre_cool_start: str) -> dict:
    """
    Save a pre-cooling schedule into Supabase.

    Expected table:
    - pre_cooling_schedule(id, room_id, booking_start, pre_cool_start, status, created_at)
    """
    supabase = _require_supabase()

    payload = {
        "room_id": room_id,
        "booking_start": booking_start,
        "pre_cool_start": pre_cool_start,
        "status": "scheduled",
    }

    response = supabase.table("pre_cooling_schedule").insert(payload).execute()

    return {
        "status": "success",
        "message": "Pre-cooling schedule saved",
        "data": response.data,
    }


def get_due_pre_cooling_schedules() -> list[dict]:
    """
    Fetch scheduled pre-cooling rows that are due now or overdue.
    """
    supabase = _require_supabase()
    now_iso = _utc_now().isoformat()

    response = (
        supabase.table("pre_cooling_schedule")
        .select("*")
        .eq("status", "scheduled")
        .lte("pre_cool_start", now_iso)
        .execute()
    )

    return response.data or []


def mark_pre_cooling_schedule_completed(schedule_id: str) -> dict:
    """
    Mark a pre-cooling schedule as completed.
    """
    supabase = _require_supabase()

    response = (
        supabase.table("pre_cooling_schedule")
        .update({"status": "completed"})
        .eq("id", schedule_id)
        .execute()
    )

    return {
        "status": "success",
        "message": "Pre-cooling schedule marked completed",
        "data": response.data,
    }


# =========================================================
# MQTT / Execution Tools
# =========================================================

def execute_hvac_command(
    room_id: str,
    target_temperature_c: float,
    fan_speed: str,
    mode: str,
    duration_min: int,
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
    _get_mqtt_client()

    event = threading.Event()
    _optimizer_response_events[request_id] = event

    payload = request.model_dump()
    payload["request_id"] = request_id

    publish_result = _publish_mqtt(MQTT_TOPIC_OPTIMIZER_REQUEST, payload)
    if publish_result["status"] != "sent":
        _optimizer_response_events.pop(request_id, None)
        raise RuntimeError(f"Failed to publish optimizer request: {publish_result['message']}")

    got_response = event.wait(timeout=MQTT_OPTIMIZER_TIMEOUT_SEC)

    if not got_response:
        _optimizer_response_events.pop(request_id, None)
        _optimizer_response_store.pop(request_id, None)
        raise TimeoutError(
            f"Timed out waiting for optimizer response after {MQTT_OPTIMIZER_TIMEOUT_SEC} seconds"
        )

    raw_response = _optimizer_response_store.pop(request_id, None)
    _optimizer_response_events.pop(request_id, None)

    if raw_response is None:
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
    Pause optimizer for a room until a future time.
    """
    expiry = _utc_now() + timedelta(minutes=duration_min)
    optimizer_pause_state[room_id] = expiry

    return {
        "status": "paused",
        "room_id": room_id,
        "paused_until": expiry.isoformat(),
        "message": f"Optimizer paused for {duration_min} minutes",
    }


def is_optimizer_paused(room_id: str) -> bool:
    """
    Check whether optimizer is currently paused for a room.
    """
    expiry = optimizer_pause_state.get(room_id)

    if expiry is None:
        return False

    if _utc_now() >= expiry:
        del optimizer_pause_state[room_id]
        return False

    return True


def get_optimizer_pause_status(room_id: str) -> dict:
    """
    Return optimizer pause status for visibility/debugging.
    """
    expiry = optimizer_pause_state.get(room_id)

    if expiry is None:
        return {
            "room_id": room_id,
            "paused": False,
            "paused_until": None,
        }

    if _utc_now() >= expiry:
        del optimizer_pause_state[room_id]
        return {
            "room_id": room_id,
            "paused": False,
            "paused_until": None,
        }

    return {
        "room_id": room_id,
        "paused": True,
        "paused_until": expiry.isoformat(),
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