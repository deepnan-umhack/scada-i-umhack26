from datetime import datetime, timedelta
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


class _FakeForecastTool:
    def __init__(self, payload: dict):
        self.payload = payload

    def invoke(self, _args: dict) -> dict:
        return self.payload


def test_precool_start_returns_failed_for_invalid_booking_start() -> None:
    result = toolkit.calculate_weather_aware_precool_start("not-a-date")

    assert result["status"] == "failed"
    assert "Invalid booking_start format" in result["reason"]
    assert result["pre_cool_start"] is None
    _record_result("UT-01", "Invalid booking_start", f"status={result['status']}, pre_cool_start={result['pre_cool_start']}")


def test_precool_start_falls_back_to_20_minutes_when_weather_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(
        toolkit,
        "get_kl_weather_forecast",
        _FakeForecastTool({"status": "failed", "reason": "network down"}),
    )

    booking_start = "2026-04-24T14:00:00+08:00"
    result = toolkit.calculate_weather_aware_precool_start(booking_start)

    expected_start = datetime.fromisoformat(booking_start).replace(microsecond=0) - timedelta(minutes=20)

    assert result["status"] == "success"
    assert result["pre_cool_duration_recommended_min"] == 20
    assert result["outside_temperature_c"] is None
    assert result["pre_cool_start"] == expected_start.isoformat()
    _record_result("UT-02", "Weather unavailable fallback", f"pre_cool_start={result['pre_cool_start']}, duration={result['pre_cool_duration_recommended_min']}")


def test_precool_start_uses_30_min_for_extreme_heat(monkeypatch) -> None:
    monkeypatch.setattr(
        toolkit,
        "get_kl_weather_forecast",
        _FakeForecastTool(
            {
                "status": "success",
                "outside_temperature_c": 35.0,
                "outside_humidity_percent": 80,
            }
        ),
    )

    result = toolkit.calculate_weather_aware_precool_start("2026-04-24T14:00:00+08:00")

    assert result["status"] == "success"
    assert result["pre_cool_duration_recommended_min"] == 30
    assert result["outside_temperature_c"] == 35.0
    _record_result("UT-03", "Extreme heat band", f"outside_temperature_c={result['outside_temperature_c']}, duration={result['pre_cool_duration_recommended_min']}")


def test_precool_start_temperature_bands(monkeypatch) -> None:
    test_cases = [
        (32.0, 25),
        (28.0, 20),
        (27.9, 15),
    ]

    for outside_temp, expected_minutes in test_cases:
        monkeypatch.setattr(
            toolkit,
            "get_kl_weather_forecast",
            _FakeForecastTool(
                {
                    "status": "success",
                    "outside_temperature_c": outside_temp,
                    "outside_humidity_percent": 70,
                }
            ),
        )

        result = toolkit.calculate_weather_aware_precool_start("2026-04-24T14:00:00+08:00")

        assert result["status"] == "success"
        assert result["pre_cool_duration_recommended_min"] == expected_minutes
        _record_result("UT-04", f"Temperature band for {outside_temp}C", f"duration={result['pre_cool_duration_recommended_min']}")


def test_print_actual_results_for_unit_test_table() -> None:
    """Print compact Actual Result rows for report table copy/paste (use -s)."""
    for row in ACTUAL_RESULTS:
        print(
            f"{row['test_id']} | {row['scenario']} | Actual Result: {row['actual_result']} | {row['status']}"
        )
    assert len(ACTUAL_RESULTS) >= 6
