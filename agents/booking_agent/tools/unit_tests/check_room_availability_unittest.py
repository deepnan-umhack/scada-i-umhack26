import json
import sys
import types
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

fake_asyncpg = types.ModuleType("asyncpg")
async def _missing_connect(*_args, **_kwargs):
    raise RuntimeError("asyncpg.connect not mocked")
fake_asyncpg.connect = _missing_connect
sys.modules.setdefault("asyncpg", fake_asyncpg)

fake_langchain_core = types.ModuleType("langchain_core")
fake_tools = types.ModuleType("langchain_core.tools")

def _tool_decorator(fn=None, *args, **kwargs):
    if fn is None:
        return lambda f: f
    return fn

fake_tools.tool = _tool_decorator
fake_langchain_core.tools = fake_tools
sys.modules.setdefault("langchain_core", fake_langchain_core)
sys.modules.setdefault("langchain_core.tools", fake_tools)

import booking_agent.tools.CheckRoomAvailability as module

ACTUAL_RESULTS: list[dict[str, str]] = []

def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status})


@pytest.mark.asyncio
async def test_check_room_uses_fallback_rooms_when_database_missing(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.check_room_availability_tool(
        start_time_utc=datetime.now(timezone.utc),
        duration_minutes=60,
        min_capacity=1,
        required_features=None,
    )

    payload = json.loads(result)
    assert payload["status"] == "success"
    assert len(payload["available_rooms"]) >= 1
    _record_result("UT-01", "Fallback room list", f"status={payload['status']}, rooms={len(payload['available_rooms'])}")


@pytest.mark.asyncio
async def test_check_room_filters_required_features(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.check_room_availability_tool(
        start_time_utc="2026-04-24T14:00:00+00:00",
        duration_minutes=60,
        min_capacity=1,
        required_features=["projector"],
    )

    payload = json.loads(result)
    assert payload["status"] == "success"
    assert all("projector" in (room.get("features") or []) for room in payload["available_rooms"])
    _record_result("UT-02", "Required features filter", f"status={payload['status']}, rooms={len(payload['available_rooms'])}")


@pytest.mark.asyncio
async def test_check_room_returns_no_rooms_found_when_filter_excludes_all(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.check_room_availability_tool(
        start_time_utc="2026-04-24T14:00:00+00:00",
        duration_minutes=60,
        min_capacity=1,
        required_features=["non-existent-feature"],
    )

    payload = json.loads(result)
    assert payload["status"] == "no_rooms_found"
    _record_result("UT-03", "No matching features", f"status={payload['status']}, message={payload['message']}")


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
