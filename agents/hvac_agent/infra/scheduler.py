import time
from datetime import datetime, timezone

from hvac_agent.core.schemas import UserRequest
from hvac_agent.core.service import handle_hvac_request
from hvac_agent.core.tools import (
    get_due_pre_cooling_schedules,
    mark_pre_cooling_schedule_completed,
    resolve_room_name,
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_pre_cooling_once():
    """
    One scheduler cycle:
    - fetch due pre-cooling schedules
    - trigger HVAC agent
    - mark completed
    """
    due_rows = get_due_pre_cooling_schedules()

    if not due_rows:
        print("[SCHEDULER] No due pre-cooling schedules.")
        return

    print(f"[SCHEDULER] Found {len(due_rows)} due pre-cooling schedule(s).")

    for row in due_rows:
        room_id = row["room_id"]
        schedule_id = row["id"]

        try:
            room_name = resolve_room_name(room_id)
        except Exception:
            room_name = room_id

        print(f"\n[SCHEDULER] Triggering pre-cooling for room: {room_name} ({room_id})")
        print(f"[SCHEDULER] Booking start: {row['booking_start']}")
        print(f"[SCHEDULER] Pre-cool start: {row['pre_cool_start']}")

        request = UserRequest(
            user_id="system",
            room_id=room_id,   # internal UUID is fine here
            request_type="PRE_COOLING",
            requested_temperature_c=None,
            timestamp=utc_now_iso()
        )

        result = handle_hvac_request(request)
        print(result)

        execution = result.get("execution") or {}
        status = execution.get("status")

        if status in {"success", "sent", "skipped"}:
            mark_pre_cooling_schedule_completed(schedule_id)
            print(f"[SCHEDULER] Marked schedule {schedule_id} as completed.")
        else:
            print(f"[SCHEDULER] Schedule {schedule_id} not completed due to HVAC execution status: {status}")


def run_scheduler_loop(interval_seconds: int = 30):
    """
    Continuous scheduler loop.
    Checks every N seconds.
    """
    print(f"[SCHEDULER] Starting loop. Checking every {interval_seconds} seconds...")
    while True:
        try:
            run_pre_cooling_once()
        except Exception as e:
            print(f"[SCHEDULER] Error: {e}")

        time.sleep(interval_seconds)


if __name__ == "__main__":
    # Choose one:
    # run_pre_cooling_once()      # single-run mode
    run_scheduler_loop(30)        # continuous mode