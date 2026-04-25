from agents.hvac_agent.core.schemas import (
    RoomState,
    UserRequest,
    PolicyConstraints,
    HVACDecision,
)


def hvac_controller(
    room_state: RoomState,
    user_request: UserRequest | None,
    policy: PolicyConstraints,
) -> HVACDecision:
    action = "NO_ACTION"
    target_temp = None
    fan_speed = None
    mode = None
    duration = None
    reason = ""
    confidence = 0.9
    optimizer_used = False
    optimizer_mode = None

    # =========================
    # 1. Data validation
    # =========================
    if room_state.occupancy_confidence < 0.5:
        return HVACDecision(
            action="NO_ACTION",
            room_id=room_state.room_id,
            target_temperature_c=None,
            fan_speed=None,
            mode=None,
            duration_min=None,
            reason="Low occupancy confidence, skipping action",
            confidence=0.5,
            requires_approval=False,
            optimizer_used=False,
            optimizer_mode=None
        )

    # =========================
    # 2. USER OVERRIDE FLOW
    # =========================
    if user_request and user_request.request_type == "SET_TEMPERATURE":
        requested_temp = user_request.requested_temperature_c

        if requested_temp is None:
            return HVACDecision(
                action="NO_ACTION",
                room_id=room_state.room_id,
                target_temperature_c=None,
                fan_speed=None,
                mode=None,
                duration_min=None,
                reason="Invalid request: no temperature provided",
                confidence=0.6,
                requires_approval=False,
                optimizer_used=False,
                optimizer_mode=None
            )

        # Apply policy bounds
        if requested_temp < policy.min_temperature_c:
            target_temp = policy.min_temperature_c
            reason = f"Requested {requested_temp}°C below minimum. Adjusted to {target_temp}°C."

        elif requested_temp > policy.max_temperature_c:
            target_temp = policy.max_temperature_c
            reason = f"Requested {requested_temp}°C above maximum. Adjusted to {target_temp}°C."

        else:
            target_temp = requested_temp
            reason = "Requested temperature is within allowed range."

        # Occupancy check
        if not room_state.occupied and not policy.allow_cooling_when_unoccupied:
            return HVACDecision(
                action="NO_ACTION",
                room_id=room_state.room_id,
                target_temperature_c=None,
                fan_speed=None,
                mode=None,
                duration_min=None,
                reason="Room is unoccupied. Cooling not allowed.",
                confidence=0.85,
                requires_approval=False,
                optimizer_used=False,
                optimizer_mode=None
            )

        # Avoid redundant action
        if abs(room_state.current_setpoint_c - target_temp) < 0.5:
            return HVACDecision(
                action="NO_ACTION",
                room_id=room_state.room_id,
                target_temperature_c=None,
                fan_speed=None,
                mode=None,
                duration_min=None,
                reason="HVAC already at requested setpoint",
                confidence=0.95,
                requires_approval=False,
                optimizer_used=False,
                optimizer_mode=None
            )

        # Fan logic for direct override
        if room_state.temperature_c - target_temp > 2:
            fan_speed = "HIGH"
        else:
            fan_speed = "MEDIUM"

        mode = "COOL"
        duration = policy.max_override_duration_min
        action = "SET_HVAC"
        optimizer_used = False
        optimizer_mode = None

    # =========================
    # 3. ORCHESTRATOR-TRIGGERED PRE-COOLING
    # =========================
    elif user_request and user_request.request_type == "PRE_COOLING":
        action = "OPTIMIZE_AC"
        duration = min(policy.pre_cooling_window_min, 30)
        reason = "Pre-cooling triggered by orchestrator command."
        optimizer_used = True
        optimizer_mode = "PRE_COOLING"

    # =========================
    # 4. NORMAL OPTIMIZATION
    # Occupied room uses LightGBM during normal operation
    # =========================
    elif room_state.occupied:
        action = "OPTIMIZE_AC"
        duration = 30
        reason = "Normal occupied-room optimization triggered."
        optimizer_used = True
        optimizer_mode = "NORMAL"

    # =========================
    # 5. DEFAULT
    # =========================
    if action == "NO_ACTION":
        reason = "No valid trigger for HVAC adjustment."

    return HVACDecision(
        action=action,
        room_id=room_state.room_id,
        target_temperature_c=target_temp,
        fan_speed=fan_speed,
        mode=mode,
        duration_min=duration,
        reason=reason,
        confidence=confidence,
        requires_approval=False,
        optimizer_used=optimizer_used,
        optimizer_mode=optimizer_mode
    )