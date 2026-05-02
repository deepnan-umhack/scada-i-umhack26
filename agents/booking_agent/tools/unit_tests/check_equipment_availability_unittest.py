import json
import sys
import types
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Lightweight stub for langchain decorator
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

import booking_agent.tools.CheckEquipmentAvailability as module

ACTUAL_RESULTS: list[dict[str, str]] = []

def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status})


class _FakeConn:
    def __init__(self, rows):
        self.rows = rows

    async def fetch(self, *_args, **_kwargs):
        return self.rows

    async def close(self):
        return None


@pytest.mark.asyncio
async def test_check_equipment_returns_config_error_when_database_url_missing(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.check_equipment_availability_tool(
        start_time_utc=datetime.now(timezone.utc),
        duration_minutes=60,
        requested_items=["projector"],
    )

    payload = json.loads(result)
    assert payload["status"] == "error"
    _record_result("UT-01", "Missing DATABASE_URL", f"status={payload['status']}, message={payload['message']}")


@pytest.mark.asyncio
async def test_check_equipment_returns_inventory_for_filtered_items(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    rows = [
        {"id": "eq-1", "name": "Projector X", "total_quantity": 5, "currently_booked": 2, "available_quantity": 3},
        {"id": "eq-2", "name": "Mic A", "total_quantity": 10, "currently_booked": 1, "available_quantity": 9},
    ]

    async def _fake_connect(_url):
        return _FakeConn(rows)

    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = await module.check_equipment_availability_tool(
        start_time_utc="2026-04-24T14:00:00+00:00",
        duration_minutes=90,
        requested_items=["projector", "mic"],
    )

    payload = json.loads(result)
    assert payload["status"] == "success"
    assert len(payload["inventory"]) == 2
    _record_result("UT-02", "Filtered inventory lookup", f"status={payload['status']}, items={len(payload['inventory'])}")


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 2
