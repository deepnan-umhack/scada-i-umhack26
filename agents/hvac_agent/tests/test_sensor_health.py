from hvac_agent.core import tools


def test_diagnose_sensor_health_uses_requested_room_id(monkeypatch):
    captured = {}

    def fake_fetch_one(query, *args):
        captured.setdefault("queries", []).append((query, args))
        if "FROM room_state" in query:
            return {
                "room_id": "resolved-room-42",
                "temperature_c": 24.0,
                "humidity_percent": 55.0,
                "occupancy_count": 2,
                "occupied": True,
                "last_updated": "2026-05-02T10:00:00Z",
            }
        if "FROM hvac_state" in query:
            return {
                "room_id": "resolved-room-42",
                "current_setpoint_c": 24.0,
                "updated_at": "2026-05-02T10:00:00Z",
            }
        return None

    def fake_run(result):
        return result

    monkeypatch.setattr(tools, "fetch_one", fake_fetch_one)
    monkeypatch.setattr(tools, "run", fake_run)

    report = tools.diagnose_sensor_health("628d826f-c8f2-4185-9541-b492842f9999")

    assert report.room_id == "628d826f-c8f2-4185-9541-b492842f9999"
    assert report.status == "healthy"
    assert captured["queries"][0][1] == ("628d826f-c8f2-4185-9541-b492842f9999",)
    assert captured["queries"][1][1] == ("628d826f-c8f2-4185-9541-b492842f9999",)