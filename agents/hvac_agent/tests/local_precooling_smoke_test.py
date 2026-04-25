"""
Local smoke test for pre-cooling persistence without pytest.

Run from repo root:
python3 agents/hvac_agent/tests/local_precooling_smoke_test.py

This script:
1) stubs optional external modules (dotenv, paho-mqtt),
2) imports the HVAC tools module,
3) monkeypatches DB calls,
4) verifies datetime coercion + 30-minute cap + invalid input handling.
"""

from __future__ import annotations

import sys
import types
import os
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

os.environ.setdefault("ILMU_API_KEY", "local-test-key")
os.environ.setdefault("ILMU_MODEL", "local-test-model")
os.environ.setdefault("ILMU_BASE_URL", "http://localhost")
os.environ.setdefault("POSTGRES_URL", "postgresql://local:test@localhost:5432/local")


# -----------------------------------------------------------------------------
# Dependency stubs so this script runs even if optional packages are not installed
# -----------------------------------------------------------------------------
if "dotenv" not in sys.modules:
    dotenv_stub = types.ModuleType("dotenv")

    def _load_dotenv(*_args, **_kwargs):
        return None

    dotenv_stub.load_dotenv = _load_dotenv
    sys.modules["dotenv"] = dotenv_stub

if "paho" not in sys.modules:
    paho_mod = types.ModuleType("paho")
    mqtt_pkg = types.ModuleType("paho.mqtt")
    mqtt_client_mod = types.ModuleType("paho.mqtt.client")

    class _DummyCallbackAPIVersion:
        VERSION2 = 2

    class _DummyClient:
        def __init__(self, *_args, **_kwargs):
            pass

        def connect(self, *_args, **_kwargs):
            return 0

        def loop_start(self):
            return None

        def subscribe(self, *_args, **_kwargs):
            return (0, 0)

        def publish(self, *_args, **_kwargs):
            class _Result:
                rc = 0

            return _Result()

        def tls_set(self):
            return None

        def ws_set_options(self, **_kwargs):
            return None

    mqtt_client_mod.Client = _DummyClient
    mqtt_client_mod.CallbackAPIVersion = _DummyCallbackAPIVersion
    mqtt_client_mod.MQTT_ERR_SUCCESS = 0

    paho_mod.mqtt = mqtt_pkg
    mqtt_pkg.client = mqtt_client_mod

    sys.modules["paho"] = paho_mod
    sys.modules["paho.mqtt"] = mqtt_pkg
    sys.modules["paho.mqtt.client"] = mqtt_client_mod

if "asyncpg" not in sys.modules:
    asyncpg_stub = types.ModuleType("asyncpg")

    async def _connect(*_args, **_kwargs):
        class _Conn:
            async def fetch(self, *_args, **_kwargs):
                return []

            async def fetchrow(self, *_args, **_kwargs):
                return None

            async def execute(self, *_args, **_kwargs):
                return "OK"

            async def close(self):
                return None

        return _Conn()

    asyncpg_stub.connect = _connect
    sys.modules["asyncpg"] = asyncpg_stub


from hvac_agent.core import tools  # noqa: E402


def assert_true(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def test_caps_precooling_to_30_minutes():
    captured: dict[str, tuple] = {}

    def fake_fetch_one(query, *args):
        captured["args"] = args
        return (query, args)

    def fake_run(_):
        room_id, booking_dt, precool_dt = captured["args"]
        return {
            "id": "sched-1",
            "room_id": room_id,
            "booking_start": booking_dt,
            "pre_cool_start": precool_dt,
            "status": "scheduled",
        }

    tools.fetch_one = fake_fetch_one
    tools.run = fake_run

    result = tools.save_pre_cooling_schedule(
        room_id="room-123",
        booking_start="2026-05-10T10:00:00Z",
        pre_cool_start="2026-05-10T08:45:00Z",
    )

    assert_true(result["status"] == "success", "Expected success status")
    assert_true("adjustment_note" in result, "Expected 30-minute cap adjustment note")

    room_id, booking_dt, precool_dt = captured["args"]
    assert_true(room_id == "room-123", "Room id mismatch")
    assert_true(
        booking_dt == datetime(2026, 5, 10, 10, 0, tzinfo=timezone.utc),
        "Booking datetime mismatch",
    )
    assert_true(
        precool_dt == datetime(2026, 5, 10, 9, 30, tzinfo=timezone.utc),
        "Pre-cool datetime should be capped to 30 minutes before booking",
    )


def test_accepts_datetime_inputs():
    captured: dict[str, tuple] = {}

    def fake_fetch_one(query, *args):
        captured["args"] = args
        return (query, args)

    def fake_run(_):
        room_id, booking_dt, precool_dt = captured["args"]
        return {
            "id": "sched-2",
            "room_id": room_id,
            "booking_start": booking_dt,
            "pre_cool_start": precool_dt,
            "status": "scheduled",
        }

    tools.fetch_one = fake_fetch_one
    tools.run = fake_run

    booking_start = datetime(2026, 6, 1, 9, 0, tzinfo=timezone.utc)
    pre_cool_start = datetime(2026, 6, 1, 8, 40, tzinfo=timezone.utc)

    result = tools.save_pre_cooling_schedule(
        room_id="room-abc",
        booking_start=booking_start,
        pre_cool_start=pre_cool_start,
    )

    assert_true(result["status"] == "success", "Expected success status")

    room_id, booking_dt, precool_dt = captured["args"]
    assert_true(room_id == "room-abc", "Room id mismatch")
    assert_true(booking_dt == booking_start, "Datetime booking input mismatch")
    assert_true(precool_dt == pre_cool_start, "Datetime pre-cool input mismatch")


def test_invalid_input_skips_db_call():
    called = {"run": 0}

    def fake_run(_):
        called["run"] += 1
        return None

    tools.run = fake_run

    result = tools.save_pre_cooling_schedule(
        room_id="room-x",
        booking_start="not-a-datetime",
        pre_cool_start="2026-05-10T09:30:00Z",
    )

    assert_true(result["status"] == "failed", "Expected failed status")
    assert_true("Invalid datetime format" in result["message"], "Expected format error message")
    assert_true(called["run"] == 0, "DB call should not occur for invalid input")


def main():
    tests = [
        test_caps_precooling_to_30_minutes,
        test_accepts_datetime_inputs,
        test_invalid_input_skips_db_call,
    ]

    print("Running HVAC pre-cooling smoke tests...")
    passed = 0

    for test_func in tests:
        name = test_func.__name__
        try:
            test_func()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as exc:
            print(f"[FAIL] {name}: {exc}")

    print(f"\nSummary: {passed}/{len(tests)} passed")
    if passed != len(tests):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
