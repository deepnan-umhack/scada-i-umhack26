import asyncio
import json
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# --- Lightweight stubs for external deps used by tool module ---
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
class _BaseModel:  # pragma: no cover
    pass

def _field(default=None, **_kwargs):  # pragma: no cover
    return default
fake_pydantic.BaseModel = _BaseModel
fake_pydantic.Field = _field
sys.modules.setdefault("pydantic", fake_pydantic)

# reportlab stubs
for mod_name in [
    "reportlab",
    "reportlab.lib",
    "reportlab.lib.pagesizes",
    "reportlab.lib.colors",
    "reportlab.lib.styles",
    "reportlab.platypus",
    "reportlab.lib.units",
]:
    sys.modules.setdefault(mod_name, types.ModuleType(mod_name))

sys.modules["reportlab.lib.pagesizes"].A4 = (595, 842)
sys.modules["reportlab.lib.colors"].HexColor = lambda x: x
sys.modules["reportlab.lib.colors"].black = "black"
sys.modules["reportlab.lib.colors"].white = "white"
sys.modules["reportlab.lib.styles"].getSampleStyleSheet = lambda: {"Heading1": {}, "Heading2": {}, "Normal": {}}
sys.modules["reportlab.lib.styles"].ParagraphStyle = lambda *args, **kwargs: {}
sys.modules["reportlab.platypus"].SimpleDocTemplate = object
sys.modules["reportlab.platypus"].Paragraph = object
sys.modules["reportlab.platypus"].Spacer = object
sys.modules["reportlab.platypus"].Table = object
sys.modules["reportlab.platypus"].TableStyle = object
sys.modules["reportlab.lib.units"].cm = 1

fake_supabase = types.ModuleType("supabase")
fake_supabase.create_client = lambda *_args, **_kwargs: None
class _Client:  # pragma: no cover
    pass
fake_supabase.Client = _Client
sys.modules.setdefault("supabase", fake_supabase)

import esg_agent.tools.GenerateEsgReport as module

ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status})


class _FakeConn:
    def __init__(self):
        self.closed = False

    async def execute(self, *_args, **_kwargs):
        return "INSERT 0 1"

    async def close(self):
        self.closed = True


def test_generate_esg_report_rejects_invalid_date_format():
    result = asyncio.run(
        module.generate_esg_report_tool(
            start_date="not-a-date",
            end_date="2026-05-01T23:59:59Z",
            total_energy_kwh=100.0,
            carbon_emissions_kg=50.0,
            hvac_efficiency=90,
        )
    )

    assert result.startswith("ERROR: Invalid date format")
    _record_result("UT-01", "Invalid ISO date input", f"result={result}")


def test_generate_esg_report_fails_when_env_not_configured(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", None)
    monkeypatch.setattr(module, "SUPABASE_URL", None)

    result = asyncio.run(
        module.generate_esg_report_tool(
            start_date="2026-05-01T00:00:00Z",
            end_date="2026-05-01T23:59:59Z",
            total_energy_kwh=100.0,
            carbon_emissions_kg=50.0,
            hvac_efficiency=90,
        )
    )

    assert result.startswith("CRITICAL ERROR: Database or Supabase URL is not configured")
    _record_result("UT-02", "Missing DB/Supabase config", f"result={result}")


def test_generate_esg_report_returns_success_payload(monkeypatch):
    monkeypatch.setattr(module, "DATABASE_URL", "postgres://fake")
    monkeypatch.setattr(module, "SUPABASE_URL", "https://fake.supabase.co")

    async def _fake_to_thread(fn, data):
        return "https://fake.supabase.co/storage/v1/object/public/esg-reports/fake.pdf"

    async def _fake_connect(_url):
        return _FakeConn()

    monkeypatch.setattr(module.asyncio, "to_thread", _fake_to_thread)
    monkeypatch.setattr(module.asyncpg, "connect", _fake_connect)

    result = asyncio.run(
        module.generate_esg_report_tool(
            start_date="2026-05-01T00:00:00Z",
            end_date="2026-05-01T23:59:59Z",
            total_energy_kwh=1234.5,
            carbon_emissions_kg=678.9,
            hvac_efficiency=95,
            requested_by="Unit Tester",
        )
    )

    payload = json.loads(result)
    assert payload["status"] == "success"
    assert payload["pdf_download_url"].endswith("fake.pdf")
    _record_result("UT-03", "Successful ESG report flow", f"status={payload['status']}, report_id={payload['report_id']}")


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
