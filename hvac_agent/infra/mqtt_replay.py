import json
import os
import time
from typing import Optional

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from infra.supabase_client import supabase

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_SENSOR_REPLAY = os.getenv("MQTT_TOPIC_SENSOR_REPLAY", "scadai/room_state/replay")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[REPLAY] Connected to MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"[REPLAY] MQTT connection failed with code {rc}")


client.on_connect = on_connect


def fetch_history_rows(limit: int = 100, room_id: Optional[str] = None):
    query = (
        supabase.table("room_sensor_history")
        .select("*")
        .order("timestamp", desc=False)
        .limit(limit)
    )

    if room_id:
        query = query.eq("room_id", room_id)

    response = query.execute()
    return response.data or []


ROOM_NAME = "Huddle Room 1"

def resolve_room_id(room_name: str) -> str:
    response = (
        supabase.table("rooms")
        .select("id")
        .eq("name", room_name)
        .limit(1)
        .execute()
    )
    return response.data[0]["id"]

ROOM_ID = resolve_room_id(ROOM_NAME)

def publish_row(row: dict):
    payload = {
    "room_id": ROOM_ID,
    "timestamp": row["timestamp"],
    "temperature_c": row["room_temp"],
    "humidity_percent": row["outside_humidity"],  # temp fallback
    "occupied": row["is_occupied"],
    "occupancy_count": row["occupancy_count"],
    "fan_speed": row["fan_speed"],
    "current_setpoint_c": row["ac_temp_setting"],
    "mode": "COOL",
    "ac_on": True if row["ac_temp_setting"] is not None else False
    }

    result = client.publish(MQTT_TOPIC_SENSOR_REPLAY, json.dumps(payload))
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"[REPLAY] Published row for {payload['room_id']} at {payload['timestamp']}")
    else:
        print(f"[REPLAY] Failed to publish row for {payload['room_id']}")


def replay_history(limit: int = 100, interval_seconds: float = 1.0, room_id: Optional[str] = None):
    rows = fetch_history_rows(limit=limit, room_id=room_id)
    print(f"[REPLAY] Fetched {len(rows)} rows from room_sensor_history")

    for row in rows:
        publish_row(row)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    replay_history(limit=50, interval_seconds=1.0, room_id=None)

    client.loop_stop()
    client.disconnect()