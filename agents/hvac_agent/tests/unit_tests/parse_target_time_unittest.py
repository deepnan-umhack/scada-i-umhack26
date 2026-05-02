from datetime import datetime, timezone
import sys
import types

import pytest


# Provide a lightweight stub for langchain tool decorator so hvac_toolkit can import
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

from hvac_agent.hvac_toolkit import _parse_target_time


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


def test_parse_target_time_accepts_trailing_z_as_utc() -> None:
    dt = _parse_target_time("2026-04-24T14:00:00Z")
    assert dt == datetime(2026, 4, 24, 14, 0, 0, tzinfo=timezone.utc)
    _record_result("UT-01", "Trailing Z UTC parse", dt.isoformat())


def test_parse_target_time_accepts_offset_datetime() -> None:
    dt = _parse_target_time("2026-04-24T14:00:00+08:00")
    assert dt.isoformat() == "2026-04-24T14:00:00+08:00"
    _record_result("UT-02", "Offset datetime parse", dt.isoformat())


def test_parse_target_time_strips_whitespace() -> None:
    dt = _parse_target_time("  2026-04-24T14:00:00+00:00  ")
    assert dt == datetime(2026, 4, 24, 14, 0, 0, tzinfo=timezone.utc)
    _record_result("UT-03", "Whitespace-trimmed parse", dt.isoformat())


@pytest.mark.parametrize(
    "bad_value",
    [
        "",
        "not-a-date",
        "2026/04/24 14:00",
    ],
)
def test_parse_target_time_raises_value_error_for_invalid_input(bad_value: str) -> None:
    with pytest.raises(ValueError):
        _parse_target_time(bad_value)
    _record_result("UT-04", f"Invalid input '{bad_value}'", "ValueError raised as expected")


def test_print_actual_results_for_unit_test_table() -> None:
    """Print a compact Actual Result summary for report table usage.

    Run pytest with -s to display these lines in terminal output.
    """
    for row in ACTUAL_RESULTS:
        print(
            f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}"
        )
    assert len(ACTUAL_RESULTS) >= 6
