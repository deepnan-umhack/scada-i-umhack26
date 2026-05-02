import json
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

fake_dotenv = types.ModuleType("dotenv")
fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None
fake_dotenv.find_dotenv = lambda *_args, **_kwargs: ""
sys.modules.setdefault("dotenv", fake_dotenv)

fake_asyncpg = types.ModuleType("asyncpg")
fake_asyncpg.connect = None
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

import booking_agent.tools.GetRoomDirectory as module

ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append(
        {"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status}
    )


class _FakeConn:
    def __init__(self, rows):
        self.rows = rows
        self.closed = False

    async def fetch(self, *_args, **_kwargs):
        return self.rows

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_get_room_directory_returns_error_when_database_url_missing(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = await module.get_room_directory_tool(min_capacity=4)
    payload = json.loads(result)

    assert payload["status"] == "error"
    _record_result("UT-01", "Missing DATABASE_URL", f"status={payload['status']}, message={payload['message']}")


@pytest.mark.asyncio
async def test_get_room_directory_returns_no_rooms_when_query_empty(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    async def _fake_connect(_url):
        return _FakeConn([])

    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = await module.get_room_directory_tool(min_capacity=50)
    payload = json.loads(result)

    assert payload["status"] == "no_rooms"
    _record_result("UT-02", "Empty room query result", f"status={payload['status']}, message={payload['message']}")


@pytest.mark.asyncio
async def test_get_room_directory_returns_aggregated_room_types(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    rows = [
        {"id": "r1", "name": "Boardroom Alpha", "capacity": 10, "type": "boardroom", "description": "", "features": ["projector", "whiteboard"]},
        {"id": "r2", "name": "Boardroom Beta", "capacity": 12, "type": "boardroom", "description": "", "features": ["display"]},
        {"id": "r3", "name": "Huddle 1", "capacity": 6, "type": "huddle", "description": "", "features": ["whiteboard"]},
    ]

    async def _fake_connect(_url):
        return _FakeConn(rows)

    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = await module.get_room_directory_tool(min_capacity=4, required_features=["projector"], limit=5)
    payload = json.loads(result)

    assert payload["status"] == "success"
    assert len(payload["available_types"]) == 1
    summary = payload["available_types"][0]
    assert summary["room_type"] == "boardroom"
    assert summary["total_rooms_of_this_type"] == 1

    _record_result(
        "UT-03",
        "Aggregated types with required feature filter",
        f"status={payload['status']}, room_types={len(payload['available_types'])}, top_type={summary['room_type']}",
    )


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
