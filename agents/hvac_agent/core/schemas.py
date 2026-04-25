from pydantic import BaseModel
from typing import Optional

class RoomState(BaseModel):
    room_id: str
    temperature_c: float
    humidity_percent: float
    occupied: bool
    occupancy_count: int
    occupancy_confidence: float
    ac_on: bool
    current_setpoint_c: float
    fan_speed: str
    mode: str
    last_updated: str


class UserRequest(BaseModel):
    user_id: str
    room_id: str
    request_type: str
    requested_temperature_c: Optional[float]
    timestamp: str
    request_id: Optional[str] = None


class PolicyConstraints(BaseModel):
    min_temperature_c: float
    max_temperature_c: float
    max_override_duration_min: int
    pre_cooling_window_min: int
    allow_cooling_when_unoccupied: bool


class HVACDecision(BaseModel):
    action: str
    room_id: str
    target_temperature_c: Optional[float]
    fan_speed: Optional[str]
    mode: Optional[str]
    duration_min: Optional[int]
    reason: str
    confidence: float
    requires_approval: bool
    optimizer_used: bool = False
    optimizer_mode: Optional[str] = None


class OptimizerRequest(BaseModel):
    room_id: str
    current_temperature_c: float
    humidity_percent: float
    occupied: bool
    occupancy_count: int
    weather_temperature_c: float
    weather_humidity_percent: float
    current_setpoint_c: float
    current_fan_speed: str
    current_mode: str
    optimization_mode: str  # NORMAL or PRE_COOLING
    min_allowed_temperature_c: float
    max_allowed_temperature_c: float
    min_allowed_fan_speed: Optional[str] = None


class OptimizerResponse(BaseModel):
    recommended_temperature_c: float
    recommended_fan_speed: str
    recommended_mode: str
    model_name: str
    status: str
    reason: str


class BookingContext(BaseModel):
    is_booked_now: bool
    next_booking_start: Optional[str]
    next_booking_end: Optional[str]
    minutes_until_next_booking: Optional[int]
    booking_title: Optional[str]


class SensorHealthReport(BaseModel):
    room_id: str
    status: str  # healthy | degraded | failed
    checked_at: str
    issues: list[str]
    warnings: list[str]
    metrics: dict