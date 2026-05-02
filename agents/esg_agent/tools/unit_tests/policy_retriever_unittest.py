import asyncio
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

fake_genai = types.ModuleType("langchain_google_genai")
class _EmbeddingsStub:  # pragma: no cover
    async def aembed_query(self, _q):
        return [0.0] * 768
fake_genai.GoogleGenerativeAIEmbeddings = _EmbeddingsStub
sys.modules.setdefault("langchain_google_genai", fake_genai)

fake_pydantic = types.ModuleType("pydantic")
class _BaseModel:  # pragma: no cover
    pass

def _field(default=None, **_kwargs):
    return default
fake_pydantic.BaseModel = _BaseModel
fake_pydantic.Field = _field
sys.modules.setdefault("pydantic", fake_pydantic)

fake_supabase = types.ModuleType("supabase")
fake_supabase_client = types.ModuleType("supabase.client")
fake_supabase_client.create_client = lambda *_args, **_kwargs: None
sys.modules.setdefault("supabase", fake_supabase)
sys.modules.setdefault("supabase.client", fake_supabase_client)

import esg_agent.tools.PolicyRetriever as module

ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({"test_id": test_id, "scenario": scenario, "actual_result": actual, "status": status})


class _FakeEmbeddings:
    async def aembed_query(self, _query):
        return [0.1, 0.2, 0.3]


class _RPCExec:
    def __init__(self, docs):
        self.data = docs

    def execute(self):
        return self


class _FakeSupabase:
    def __init__(self, docs):
        self._docs = docs

    def rpc(self, *_args, **_kwargs):
        return _RPCExec(self._docs)


def test_search_esg_policy_returns_error_when_no_docs(monkeypatch):
    monkeypatch.setattr(module, "_build_clients", lambda: (_FakeEmbeddings(), _FakeSupabase([])))

    result = asyncio.run(module.search_esg_policy_tool("office temperature policy"))
    assert result.startswith("ERROR: No specific policy rules found")
    _record_result("UT-01", "No matching policy docs", f"result={result}")


def test_search_esg_policy_returns_success_payload(monkeypatch):
    docs = [{"content": "Minimum office temperature is 23C."}, {"page_content": "HVAC must run in eco mode after 6 PM."}]
    monkeypatch.setattr(module, "_build_clients", lambda: (_FakeEmbeddings(), _FakeSupabase(docs)))

    result = asyncio.run(module.search_esg_policy_tool("temperature and eco mode"))
    payload = json.loads(result)

    assert payload["status"] == "success"
    assert len(payload["results"]) == 2
    _record_result("UT-02", "Policy retrieval success", f"status={payload['status']}, results={len(payload['results'])}")


def test_search_esg_policy_returns_critical_error_on_exception(monkeypatch):
    def _raise():
        raise RuntimeError("embedding service down")

    monkeypatch.setattr(module, "_build_clients", _raise)

    result = asyncio.run(module.search_esg_policy_tool("anything"))
    assert result.startswith("CRITICAL ERROR:")
    _record_result("UT-03", "Dependency exception path", f"result={result}")


def test_print_actual_results_for_unit_test_table():
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 3
