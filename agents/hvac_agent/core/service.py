from agents.hvac_agent.core.schemas import UserRequest, OptimizerRequest
from agents.hvac_agent.core.controller import hvac_controller
import uuid
from agents.hvac_agent.core.tools import (
    resolve_room_id,
    diagnose_sensor_health,
    get_room_state,
    get_policy_constraints,
    execute_hvac_command,
    notify_admin,
    request_ac_optimization,
    get_optimizer_pause_status
)
from agents.hvac_agent.utils.demo_logger import title, step, final_block


def build_demo_summary(result: dict) -> str:
    decision = result.get("decision", {}) or {}
    execution = result.get("execution", {}) or {}
    optimizer = result.get("optimizer", {}) or {}
    notification = result.get("notification", {}) or {}

    lines = []

    request_id = result.get("request_id")
    if request_id:
        lines.append(f"Request ID: {request_id}")

    lines.append(f"Action: {decision.get('action')}")
    lines.append(f"Reason: {decision.get('reason')}")

    if execution:
        lines.append(f"Execution Status: {execution.get('status')}")
        if execution.get("applied_temperature_c") is not None:
            lines.append(f"Applied Temp: {execution.get('applied_temperature_c')}°C")
        if execution.get("applied_fan_speed") is not None:
            lines.append(f"Fan Speed: {execution.get('applied_fan_speed')}")
        if execution.get("applied_mode") is not None:
            lines.append(f"Mode: {execution.get('applied_mode')}")
        if execution.get("reason") is not None and execution.get("status") in {"blocked", "skipped"}:
            lines.append(f"Execution Note: {execution.get('reason')}")

    if optimizer:
        lines.append(f"Optimizer Status: {optimizer.get('status')}")
        if optimizer.get("recommended_temperature_c") is not None:
            lines.append(f"Optimizer Temp: {optimizer.get('recommended_temperature_c')}°C")
        if optimizer.get("recommended_fan_speed") is not None:
            lines.append(f"Optimizer Fan: {optimizer.get('recommended_fan_speed')}")
        if optimizer.get("reason") is not None:
            lines.append(f"Optimizer Reason: {optimizer.get('reason')}")

    if notification:
        lines.append(f"Notification Status: {notification.get('status')}")
        if notification.get("message") is not None:
            lines.append(f"Notification Message: {notification.get('message')}")

    pause_info = result.get("optimizer_pause", {}) or {}
    if pause_info.get("paused"):
        lines.append("Optimizer Paused: True")
        if pause_info.get("paused_until") is not None:
            lines.append(f"Paused Until: {pause_info.get('paused_until')}")

    return "\n".join(lines)


def handle_hvac_request(user_request: UserRequest) -> dict:
    title("HVAC AGENT")

    if user_request.request_id:
        step("🆔", f"request_id: {user_request.request_id}")

    step("📥", f"Received request for room: {user_request.room_id}")
    step("📝", f"Request type: {user_request.request_type}")

    if user_request.requested_temperature_c is not None:
        step("🌡️", f"Requested temperature: {user_request.requested_temperature_c}°C")

    actual_room_id = resolve_room_id(user_request.room_id)

    sensor_health = diagnose_sensor_health(actual_room_id)

    if sensor_health.status == "failed":
        blocked_result = {
            "request_id": user_request.request_id,
            "decision": {
                "action": "NO_ACTION",
                "room_id": actual_room_id,
                "reason": "Sensor health check failed; HVAC action blocked for safety.",
            },
            "execution": {
                "status": "blocked",
                "reason": "Sensor diagnostics indicate critical issues.",
            },
            "notification": {
                "status": "sent",
                "message": "Sensor malfunction detected. HVAC actions blocked until sensor data recovers.",
            },
            "optimizer": None,
            "optimizer_mode": None,
            "optimizer_pause": get_optimizer_pause_status(actual_room_id),
            "sensor_health": sensor_health.model_dump(),
        }
        step("🚨", "Sensor diagnostics failed; blocking HVAC action")
        final_block("FINAL HVAC RESULT", build_demo_summary(blocked_result))
        return blocked_result

    if sensor_health.status == "degraded":
        step("⚠️", "Sensor diagnostics degraded; proceeding with caution")

    normalized_request = UserRequest(
        user_id=user_request.user_id,
        room_id=actual_room_id,
        request_type=user_request.request_type,
        requested_temperature_c=user_request.requested_temperature_c,
        timestamp=user_request.timestamp,
        request_id=user_request.request_id,
    )

    room_state = get_room_state(actual_room_id)
    policy = get_policy_constraints(actual_room_id)
    decision = hvac_controller(room_state, normalized_request, policy)

    step("🧠", f"Decision: {decision.action}")
    step("📌", f"Reason: {decision.reason}")

    result = {
        "request_id": user_request.request_id,
        "decision": decision.model_dump(),
        "execution": None,
        "notification": None,
        "optimizer": None,
        "optimizer_mode": decision.optimizer_mode,
        "optimizer_pause": get_optimizer_pause_status(decision.room_id),
        "sensor_health": sensor_health.model_dump(),
    }

    if decision.action == "SET_HVAC":
        execution_result = execute_hvac_command(
            room_id=decision.room_id,
            target_temperature_c=decision.target_temperature_c,
            fan_speed=decision.fan_speed,
            mode=decision.mode,
            duration_min=decision.duration_min
        )
        result["execution"] = execution_result
        step("⚙️", "Direct HVAC execution completed")

    elif decision.action == "OPTIMIZE_AC":
        optimizer_request = OptimizerRequest(
            room_id=decision.room_id,
            current_temperature_c=room_state.temperature_c,
            humidity_percent=room_state.humidity_percent,
            occupied=room_state.occupied,
            occupancy_count=room_state.occupancy_count,
            weather_temperature_c=32.0,
            weather_humidity_percent=75.0,
            current_setpoint_c=room_state.current_setpoint_c,
            current_fan_speed=room_state.fan_speed,
            current_mode=room_state.mode,
            optimization_mode=decision.optimizer_mode or "NORMAL",
            min_allowed_temperature_c=policy.min_temperature_c,
            max_allowed_temperature_c=policy.max_temperature_c,
            min_allowed_fan_speed="MEDIUM" if decision.optimizer_mode == "PRE_COOLING" else None
        )

        try:
            optimizer_response = request_ac_optimization(
                optimizer_request,
                request_id=user_request.request_id or str(uuid.uuid4())
            )
            result["optimizer"] = optimizer_response.model_dump()
            step("📊", f"Optimizer returned: {optimizer_response.status}")
        except Exception as e:
            result["optimizer"] = {
                "status": "failed",
                "reason": str(e)
            }
            result["execution"] = {
                "status": "blocked",
                "reason": "Optimizer request failed; HVAC command not executed."
            }
            step("❌", f"Optimizer failed: {e}")
            final_block("FINAL HVAC RESULT", build_demo_summary(result))
            return result

        if abs(room_state.current_setpoint_c - optimizer_response.recommended_temperature_c) < 0.5:
            result["execution"] = {
                "status": "skipped",
                "reason": "Optimizer result matches current setpoint"
            }
            step("✅", "No further HVAC change needed after optimization")
        else:
            execution_result = execute_hvac_command(
                room_id=decision.room_id,
                target_temperature_c=optimizer_response.recommended_temperature_c,
                fan_speed=optimizer_response.recommended_fan_speed,
                mode=optimizer_response.recommended_mode,
                duration_min=decision.duration_min or 30
            )
            result["execution"] = execution_result
            step("⚙️", "HVAC command sent from optimizer result")

    elif decision.action == "NOTIFY_ADMIN":
        notification_result = notify_admin(decision.reason)
        result["notification"] = notification_result
        step("📣", "Admin notification sent")

    elif decision.action == "NO_ACTION":
        step("✅", "No HVAC action needed")

    final_block("FINAL HVAC RESULT", build_demo_summary(result))
    return result