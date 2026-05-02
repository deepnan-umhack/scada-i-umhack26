from datetime import datetime
import sys
import types

import pytest

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

from hvac_agent.hvac_toolkit import _select_nearest_hour_index


ACTUAL_RESULTS: list[dict[str, str]] = []


def _record_result(test_id: str, scenario: str, actual: str, status: str = "Pass") -> None:
    ACTUAL_RESULTS.append({
        "test_id": test_id,
        "scenario": scenario,
        "actual_result": actual,
        "status": status,
    })


def test_select_nearest_hour_index_returns_exact_match_index() -> None:
    hourly_times = [
        "2026-04-24T09:00",
        "2026-04-24T10:00",
        "2026-04-24T11:00",
    ]
    target = datetime.fromisoformat("2026-04-24T10:00:45")

    index = _select_nearest_hour_index(hourly_times, target)

    assert index == 1
    _record_result("UT-01", "Exact hour match", f"Returned index {index}")


def test_select_nearest_hour_index_returns_hour_snapped_match_when_no_exact_minute_match() -> None:
    hourly_times = [
        "2026-04-24T09:00",
        "2026-04-24T10:00",
        "2026-04-24T11:00",
    ]
    # Function snaps target to 10:00 before matching
    target = datetime.fromisoformat("2026-04-24T10:35:00")

    index = _select_nearest_hour_index(hourly_times, target)

    assert index == 1
    _record_result("UT-02", "Hour-snapped match for 10:35", f"Returned index {index}")


def test_select_nearest_hour_index_uses_kl_timezone_for_aware_datetime() -> None:
    hourly_times = [
        "2026-04-24T20:00",
        "2026-04-24T21:00",
        "2026-04-24T22:00",
    ]
    # 13:00Z should become 21:00 in Asia/Kuala_Lumpur
    target = datetime.fromisoformat("2026-04-24T13:20:00+00:00")

    index = _select_nearest_hour_index(hourly_times, target)

    assert index == 1
    _record_result("UT-03", "Timezone-aware target converted to KL hour", f"Returned index {index}")


@pytest.mark.parametrize(
    "target_iso,expected_index",
    [
        # Function snaps to the hour before selecting index
        ("2026-04-24T09:29:00", 0),
        ("2026-04-24T09:31:00", 0),
    ],
)
def test_select_nearest_hour_index_hour_snap_behavior(target_iso: str, expected_index: int) -> None:
    hourly_times = [
        "2026-04-24T09:00",
        "2026-04-24T10:00",
        "2026-04-24T11:00",
    ]
    target = datetime.fromisoformat(target_iso)

    index = _select_nearest_hour_index(hourly_times, target)

    assert index == expected_index
    _record_result("UT-04", f"Hour snap nearest case for {target_iso}", f"Returned index {index}")


def test_print_actual_results_for_unit_test_table() -> None:
    """Print compact Actual Result rows for report table copy/paste (use -s)."""
    for row in ACTUAL_RESULTS:
        print(f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}")
    assert len(ACTUAL_RESULTS) >= 5
