import json
import sys
import types
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Lightweight stubs for external deps used by tool modules.
fake_dotenv = types.ModuleType("dotenv")
fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None
fake_dotenv.find_dotenv = lambda *_args, **_kwargs: ""
sys.modules.setdefault("dotenv", fake_dotenv)

fake_asyncpg = types.ModuleType("asyncpg")
class _ExclusionViolationError(Exception):
    pass
fake_asyncpg.connect = None
fake_asyncpg.exceptions = types.SimpleNamespace(ExclusionViolationError=_ExclusionViolationError)
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

import booking_agent.tools.CreateBookingRecord as module

ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append(
        {"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status}
    )


class _FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeConn:
    def __init__(self, *, new_booking_id: str, departments=None):
        self.new_booking_id = new_booking_id
        self.departments = departments or []
        self.executed = []
        self.closed = False

    def transaction(self):
        return _FakeTransaction()

    async def execute(self, query, *args):
        self.executed.append((query, args))

    async def fetch(self, query, *args):
        if "SELECT id FROM departments" in query:
            return [{"id": d} for d in self.departments]
        return []

    async def fetchval(self, query, *args):
        self.executed.append((query, args))
        return self.new_booking_id

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_create_booking_returns_error_when_database_url_missing(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.create_booking_tool(
        user_id="u-1",
        room_id="r-1",
        start_time_utc=datetime.now(timezone.utc).isoformat(),
        duration_minutes=60,
        purpose="Sprint planning",
        source_prompt="book room",
    )

    payload = json.loads(result)
    assert payload["status"] == "error"
    _record_result("UT-01", "Missing DATABASE_URL", f"status={payload['status']}, message={payload['message']}")


@pytest.mark.asyncio
async def test_create_booking_rejects_invalid_department_uuid(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    result = await module.create_booking_tool(
        user_id="u-1",
        room_id="r-1",
        start_time_utc="2026-04-24T14:00:00+00:00",
        duration_minutes=30,
        purpose="Ops sync",
        source_prompt="book room",
        target_department_ids=["not-a-uuid"],
    )

    payload = json.loads(result)
    assert payload["status"] == "error"
    assert "Invalid department UUID" in payload["message"]
    _record_result("UT-02", "Invalid department UUID", f"status={payload['status']}, message={payload['message']}")


@pytest.mark.asyncio
async def test_create_booking_returns_success_for_valid_payload(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    department_id = "11111111-1111-1111-1111-111111111111"
    fake_conn = _FakeConn(new_booking_id="22222222-2222-2222-2222-222222222222", departments=[department_id])

    async def _fake_connect(_url):
        return fake_conn

    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = await module.create_booking_tool(
        user_id="u-123",
        room_id="room-123",
        start_time_utc="2026-04-24T14:00:00+00:00",
        duration_minutes=45,
        purpose="Design review",
        source_prompt="book room",
        equipment_requests=[{"equipment_id": "eq-1", "quantity": 1}],
        target_department_ids=[department_id],
    )

    payload = json.loads(result)
    assert payload["status"] == "success"
    assert payload["booking_id"] == "22222222-2222-2222-2222-222222222222"
    assert payload["target_department_ids"] == [department_id]
    assert fake_conn.closed is True

    _record_result(
        "UT-03",
        "Valid booking payload",
        f"status={payload['status']}, booking_id={payload['booking_id']}, departments={len(payload['target_department_ids'])}",
    )


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
