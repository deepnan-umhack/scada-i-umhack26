import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Lightweight stub so hvac_toolkit can import in minimal environments
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

import hvac_agent.hvac_toolkit as toolkit


ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append(
        {
            "test_id": test_id,
            "scenario": scenario,
            "actual_result": actual,
            "status": status,
        }
    )


def test_run_hvac_request_returns_handler_result_on_success(monkeypatch) -> None:
    expected_payload = {
        "request_id": "req-123",
        "decision": {"action": "SET_HVAC", "reason": "ok"},
        "execution": {"status": "sent"},
        "optimizer": None,
        "optimizer_mode": None,
        "optimizer_pause": None,
    }

    monkeypatch.setattr(toolkit, "handle_hvac_request", lambda _request: expected_payload)

    result = toolkit.run_hvac_request(
        user_id="user1",
        room_id="RoomA",
        request_type="SET_TEMPERATURE",
        requested_temperature_c=24.0,
        timestamp="2026-04-24T14:00:00+08:00",
    )

    assert result == expected_payload
    _record_result("UT-01", "Success passthrough", f"action={result['decision']['action']}, execution={result['execution']['status']}")


def test_run_hvac_request_returns_error_payload_on_exception(monkeypatch) -> None:
    def _raise(_request):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(toolkit, "handle_hvac_request", _raise)

    result = toolkit.run_hvac_request(
        user_id="user1",
        room_id="RoomA",
        request_type="SET_TEMPERATURE",
        requested_temperature_c=24.0,
        timestamp="2026-04-24T14:00:00+08:00",
    )

    assert result["decision"]["action"] == "ERROR"
    assert result["execution"]["status"] == "failed"
    assert "simulated failure" in result["execution"]["reason"]
    _record_result(
        "UT-02",
        "Exception fallback payload",
        f"action={result['decision']['action']}, execution={result['execution']['status']}, reason={result['execution']['reason']}",
    )


def test_run_hvac_request_generates_request_id_in_error_payload(monkeypatch) -> None:
    monkeypatch.setattr(toolkit, "handle_hvac_request", lambda _request: (_ for _ in ()).throw(ValueError("boom")))

    result = toolkit.run_hvac_request(
        user_id="user2",
        room_id="RoomB",
        request_type="NO_USER_REQUEST",
        timestamp="2026-04-24T15:00:00+08:00",
    )

    assert isinstance(result.get("request_id"), str)
    assert result["request_id"]
    _record_result("UT-03", "Error payload includes request_id", f"request_id={result['request_id']}")


def test_print_actual_results_for_unit_test_table() -> None:
    """Print compact Actual Result rows for report table copy/paste (use -s)."""
    for row in ACTUAL_RESULTS:
        print(
            f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}"
        )
    assert len(ACTUAL_RESULTS) >= 3
