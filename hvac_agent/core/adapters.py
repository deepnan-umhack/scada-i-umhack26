from core.schemas import BookingContext, PolicyConstraints


def adapt_booking_data(raw_booking: dict) -> BookingContext:
    """
    Convert external booking-agent output into internal BookingContext schema.

    Expected teammate fields may vary, so this adapter is defensive and tries
    common alternatives.
    """

    return BookingContext(
        is_booked_now=raw_booking.get("is_booked_now", raw_booking.get("booked_now", False)),
        next_booking_start=raw_booking.get("next_booking_start", raw_booking.get("start_time")),
        next_booking_end=raw_booking.get("next_booking_end", raw_booking.get("end_time")),
        minutes_until_next_booking=raw_booking.get(
            "minutes_until_next_booking",
            raw_booking.get("time_to_start")
        ),
        booking_title=raw_booking.get("booking_title", raw_booking.get("title"))
    )


def adapt_policy_data(raw_policy: dict) -> PolicyConstraints:
    """
    Convert external ESG-agent output into internal PolicyConstraints schema.

    Supports both your current naming and a few likely alternatives from teammates.
    """

    return PolicyConstraints(
        min_temperature_c=raw_policy.get("min_temperature_c", raw_policy.get("min_temp")),
        max_temperature_c=raw_policy.get("max_temperature_c", raw_policy.get("max_temp")),
        max_override_duration_min=raw_policy.get(
            "max_override_duration_min",
            raw_policy.get("override_duration_min", 60)
        ),
        pre_cooling_window_min=raw_policy.get(
            "pre_cooling_window_min",
            raw_policy.get("pre_cool_window_min", 30)
        ),
        allow_cooling_when_unoccupied=raw_policy.get(
            "allow_cooling_when_unoccupied",
            raw_policy.get("cool_when_unoccupied", False)
        )
    )