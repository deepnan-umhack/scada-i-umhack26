"""
Regression Test Suite — /chat API Endpoint
Covers: Booking, HVAC, ESG agent flows
Pass threshold: 90%
"""

import pytest
import requests

# ─── CONFIG ───────────────────────────────────────────────
import os
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
THREAD_ID = "regression-test-thread-001"
USER_ID = "scadai_user_001"

# ─── TEST CASES ───────────────────────────────────────────
# Each case: (flow, message)
TEST_CASES = [
    # --- BOOKING FLOW ---
    ("Booking", "I need a room for 10 people tomorrow at 2 PM for 1 hour."),

    # --- HVAC FLOW ---
    ("HVAC", "Set the temperature in Huddle Room 1 to 22 degrees Celsius."),

    # --- ESG FLOW ---
    ("ESG", "Is setting the AC to 18 degrees compliant with ESG policy?"),
]

TOTAL = len(TEST_CASES)
THRESHOLD = 0.90

# ─── HELPERS ──────────────────────────────────────────────
def send_chat(message: str, thread_id: str = THREAD_ID, user_id: str = USER_ID):
    """Send a POST request to /chat with streaming enabled and return the response."""
    return requests.post(
        f"{BASE_URL}/chat",
        json={
            "message": message,
            "thread_id": thread_id,
            "user_id": user_id,
        },
        timeout=120,
        stream=True,
    )

def is_valid_response(response) -> tuple[bool, str]:
    """
    Validate the streaming response:
    - HTTP 200
    - At least one line with type='final_response' and non-empty 'details'
    Returns (passed: bool, reason: str)
    """
    if response.status_code != 200:
        return False, f"HTTP {response.status_code}"

    import json
    final_reply = None

    try:
        for raw_line in response.iter_lines():
            if not raw_line:
                continue
            # Handle SSE "data: " prefix if present
            line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
            if line.startswith("data: "):
                line = line[6:].strip()
            if not line or line == "[DONE]":
                continue
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = parsed.get("type", "")
            if event_type == "final_response":
                text = parsed.get("details") or parsed.get("text") or parsed.get("reply") or ""
                if text.strip():
                    final_reply = text
                    break  # got what we need, no point reading further
    except Exception as e:
        return False, f"Error reading stream: {e}"

    if final_reply is None:
        return False, "No 'final_response' event found in stream"
    return True, "OK"


# ─── INDIVIDUAL PYTEST CASES ──────────────────────────────
@pytest.mark.parametrize("flow,message", TEST_CASES)
def test_chat_endpoint(flow, message):
    """Each test case must return HTTP 200 with a valid reply."""
    response = send_chat(message)
    passed, reason = is_valid_response(response)
    assert passed, f"[{flow}] FAILED — {reason} | Message: '{message}'"


# ─── SUMMARY REPORT ───────────────────────────────────────
def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Print pass rate summary after all tests complete."""
    passed = len(terminalreporter.stats.get("passed", []))
    failed = len(terminalreporter.stats.get("failed", []))
    total  = passed + failed

    if total == 0:
        return

    pass_rate = passed / total
    status = "✅ Passed" if pass_rate >= THRESHOLD else "❌ Failed"

    terminalreporter.write_sep("=", "REGRESSION TEST SUMMARY")
    terminalreporter.write_line(f"  Total Cases : {total}")
    terminalreporter.write_line(f"  Passed      : {passed}")
    terminalreporter.write_line(f"  Failed      : {failed}")
    terminalreporter.write_line(f"  Minimum     : {int(THRESHOLD * 100)}%")
    terminalreporter.write_line(f"  Result      : {pass_rate * 100:.1f}%")
    terminalreporter.write_line(f"  Status      : {status}")
    terminalreporter.write_sep("=", "")