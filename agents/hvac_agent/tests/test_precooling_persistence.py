from datetime import datetime, timezone

from hvac_agent.core import tools


def test_save_pre_cooling_schedule_caps_to_30_minutes(monkeypatch):
    captured = {}

    def fake_fetch_one(query, *args):
        captured["query"] = query
        captured["args"] = args
        return (query, args)

    def fake_run(_):
        return {
            "id": "sched-1",
            "room_id": captured["args"][0],
            "booking_start": captured["args"][1],
            "pre_cool_start": captured["args"][2],
            "status": "scheduled",
        }

    monkeypatch.setattr(tools, "fetch_one", fake_fetch_one)
    monkeypatch.setattr(tools, "run", fake_run)

    result = tools.save_pre_cooling_schedule(
        room_id="room-123",
        booking_start="2026-05-10T10:00:00Z",
        pre_cool_start="2026-05-10T08:45:00Z",
    )

    assert result["status"] == "success"
    assert "adjustment_note" in result

    persisted_room_id, booking_dt, precool_dt = captured["args"]
    assert persisted_room_id == "room-123"
    assert booking_dt == datetime(2026, 5, 10, 10, 0, tzinfo=timezone.utc)
    assert precool_dt == datetime(2026, 5, 10, 9, 30, tzinfo=timezone.utc)


def test_save_pre_cooling_schedule_accepts_datetime_input(monkeypatch):
    captured = {}

    def fake_fetch_one(query, *args):
        captured["args"] = args
        return (query, args)

    def fake_run(_):
        return {
            "id": "sched-2",
            "room_id": captured["args"][0],
            "booking_start": captured["args"][1],
            "pre_cool_start": captured["args"][2],
            "status": "scheduled",
        }

    monkeypatch.setattr(tools, "fetch_one", fake_fetch_one)
    monkeypatch.setattr(tools, "run", fake_run)

    booking_start = datetime(2026, 6, 1, 9, 0, tzinfo=timezone.utc)
    pre_cool_start = datetime(2026, 6, 1, 8, 40, tzinfo=timezone.utc)

    result = tools.save_pre_cooling_schedule(
        room_id="room-abc",
        booking_start=booking_start,
        pre_cool_start=pre_cool_start,
    )

    assert result["status"] == "success"
    persisted_room_id, booking_dt, precool_dt = captured["args"]
    assert persisted_room_id == "room-abc"
    assert booking_dt == booking_start
    assert precool_dt == pre_cool_start


def test_save_pre_cooling_schedule_rejects_invalid_time_and_skips_db(monkeypatch):
    calls = {"run": 0}

    def fake_run(_):
        calls["run"] += 1
        return None

    monkeypatch.setattr(tools, "run", fake_run)

    result = tools.save_pre_cooling_schedule(
        room_id="room-x",
        booking_start="not-a-datetime",
        pre_cool_start="2026-05-10T09:30:00Z",
    )

    assert result["status"] == "failed"
    assert "Invalid datetime format" in result["message"]
    assert calls["run"] == 0


def test_schedule_precooling_for_booking_passes_data_to_persistence(monkeypatch):
    def fake_resolve_room_id(_):
        return "resolved-room-1"

    class _Recommender:
        @staticmethod
        def invoke(_):
            return {
                "status": "success",
                "pre_cool_start": "2026-05-11T13:35:00Z",
                "pre_cool_duration_recommended_min": 25,
                "outside_temperature_c": 33,
                "outside_humidity_percent": 71,
                "reason": "Very hot conditions; using 25-minute window.",
            }

    captured = {}

    def fake_save_pre_cooling_schedule(room_id, booking_start, pre_cool_start):
        captured["room_id"] = room_id
        captured["booking_start"] = booking_start
        captured["pre_cool_start"] = pre_cool_start
        return {"status": "success", "message": "ok", "data": []}

    monkeypatch.setattr("hvac_agent.hvac_toolkit.resolve_room_id", fake_resolve_room_id)
    monkeypatch.setattr("hvac_agent.hvac_toolkit.calculate_weather_aware_precool_start", _Recommender)
    monkeypatch.setattr("hvac_agent.hvac_toolkit.save_pre_cooling_schedule", fake_save_pre_cooling_schedule)

    from hvac_agent.hvac_toolkit import schedule_precooling_for_booking

    result = schedule_precooling_for_booking.func(
        booking_start="2026-05-11T14:00:00Z",
        room_id="Boardroom_A",
        booking_id="b-1",
        user_id="u-1",
    )

    assert result["status"] == "success"
    assert captured["room_id"] == "resolved-room-1"
    assert captured["booking_start"] == "2026-05-11T14:00:00Z"
    assert captured["pre_cool_start"] == "2026-05-11T13:35:00Z"
