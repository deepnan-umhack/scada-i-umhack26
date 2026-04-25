from booking_agent.tools.CheckRoomAvailability import check_room_availability_tool
from booking_agent.tools.CreateBookingRecord import create_booking_tool
from booking_agent.tools.UpdateBookingStatus import update_booking_status_tool
from booking_agent.tools.UpdateBookingDetails import update_booking_details_tool
from booking_agent.tools.GetUserBookings import get_user_bookings_tool
from booking_agent.tools.GetRoomDirectory import get_room_directory_tool
from booking_agent.tools.CheckEquipmentAvailability import check_equipment_availability_tool
from booking_agent.tools.TimeTools import get_current_datetime_malaysia_tool, convert_user_time_to_utc_tool

BOOKING_TOOLS = [
    check_room_availability_tool,
    create_booking_tool,
    update_booking_status_tool,
    update_booking_details_tool,
    get_user_bookings_tool,
    get_room_directory_tool,
    check_equipment_availability_tool,
    get_current_datetime_malaysia_tool,
    convert_user_time_to_utc_tool
]