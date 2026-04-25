from archive.orchestrator.orchestrator import orchestrate


def print_section(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


# ==========================================
# Demo 1 — Manual Override
# ==========================================
print_section("DEMO 1 — Manual Override")
result1 = orchestrate(
    user_id="admin_123",
    room_id="Boardroom_A",
    user_message="Set the AC temperature in Boardroom_A to 22C"
)
print(result1)


# ==========================================
# Demo 2 — HVAC comfort complaint
# ==========================================
print_section("DEMO 2 — Comfort Request")
result2 = orchestrate(
    user_id="user_456",
    room_id="Boardroom_A",
    user_message="It is too hot in Boardroom_A, set AC to 18C"
)
print(result2)


# ==========================================
# Demo 3 — Booking request (stub)
# ==========================================
print_section("DEMO 3 — Booking Agent Stub")
result3 = orchestrate(
    user_id="user_789",
    room_id="Boardroom_A",
    user_message="Book Boardroom_A for 2 PM tomorrow"
)
print(result3)


# ==========================================
# Demo 4 — ESG request (stub)
# ==========================================
print_section("DEMO 4 — ESG Agent Stub")
result4 = orchestrate(
    user_id="manager_001",
    room_id="Boardroom_A",
    user_message="Generate ESG policy summary for Boardroom_A"
)
print(result4)