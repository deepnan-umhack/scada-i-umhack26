import asyncio
import json
import sys
import types
from pathlib import Path

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

fake_pydantic = types.ModuleType("pydantic")
class _BaseModel:
    pass

def _field(default=None, **_kwargs):
    return default

fake_pydantic.BaseModel = _BaseModel
fake_pydantic.Field = _field
sys.modules.setdefault("pydantic", fake_pydantic)

import esg_agent.tools.AnalyzeHvacCompliance as module

ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status})


class _FakeConn:
    def __init__(self, rows):
        self.rows = rows
        self.closed = False

    async def fetch(self, *_args, **_kwargs):
        return self.rows

    async def close(self):
        self.closed = True


def test_analyze_hvac_compliance_rejects_invalid_date_format():
    result = asyncio.run(module.analyze_hvac_compliance_tool("bad-date", "2026-05-01T23:59:59Z"))
    assert result.startswith("ERROR: Invalid date format")
    _record_result("UT-01", "Invalid date format", f"result={result}")


def test_analyze_hvac_compliance_fails_when_db_url_missing(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)

    result = asyncio.run(module.analyze_hvac_compliance_tool("2026-05-01T00:00:00Z", "2026-05-01T23:59:59Z"))
    assert result.startswith("CRITICAL ERROR: DATABASE_URL is not configured")
    _record_result("UT-02", "Missing DATABASE_URL", f"result={result}")


def test_analyze_hvac_compliance_returns_success_payload(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")

    rows = [
        {"is_occupied": False, "power_kw": 2.4, "ac_temp_setting": 21.5},
        {"is_occupied": True, "power_kw": 2.0, "ac_temp_setting": 23.0},
        {"is_occupied": False, "power_kw": 1.8, "ac_temp_setting": 20.0},
    ]

    async def _fake_connect(_url):
        return _FakeConn(rows)

    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = asyncio.run(module.analyze_hvac_compliance_tool("2026-05-01T00:00:00Z", "2026-05-01T23:59:59Z"))
    payload = json.loads(result)

    assert payload["status"] == "success"
    assert payload["audit_results"]["total_operational_hours_checked"] == 3
    assert payload["audit_results"]["unoccupied_wastage_incidents"] == 2
    assert payload["audit_results"]["extreme_cooling_policy_violations"] == 2

    _record_result(
        "UT-03",
        "Success with mixed occupancy/temperature rows",
        (
            "status=success, total=3, "
            f"wastage={payload['audit_results']['unoccupied_wastage_incidents']}, "
            f"extreme={payload['audit_results']['extreme_cooling_policy_violations']}, "
            f"score={payload['audit_results']['eco_policy_compliance_score']}"
        ),
    )


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
