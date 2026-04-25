import json
import os

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from infra.supabase_client import supabase

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_SENSOR_REPLAY = os.getenv("MQTT_TOPIC_SENSOR_REPLAY", "scadai/room_state/replay")


def upsert_room_state(payload: dict):
    row = {
        "room_id": payload["room_id"],
        "temperature_c": payload["temperature_c"],
        "humidity_percent": payload["humidity_percent"],
        "occupied": payload["occupied"],
        "occupancy_count": payload["occupancy_count"],
        "last_updated": payload["timestamp"],
    }

    response = supabase.table("room_state").upsert(row).execute()
    return response.data


def upsert_hvac_state(payload: dict):
    row = {
        "room_id": payload["room_id"],
        "current_setpoint_c": payload["current_setpoint_c"],
        "fan_speed": payload["fan_speed"],
        "mode": payload["mode"],
        "ac_on": payload["ac_on"],
        "updated_at": payload["timestamp"],
    }

    response = supabase.table("hvac_state").upsert(row).execute()
    return response.data


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[INGESTOR] Connected to MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_SENSOR_REPLAY)
        print(f"[INGESTOR] Subscribed to {MQTT_TOPIC_SENSOR_REPLAY}")
    else:
        print(f"[INGESTOR] MQTT connection failed with code {rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"[INGESTOR] Received row for {payload['room_id']} at {payload['timestamp']}")

        upsert_room_state(payload)
        upsert_hvac_state(payload)

        print(f"[INGESTOR] Updated room_state + hvac_state for {payload['room_id']}")

    except Exception as e:
        print(f"[INGESTOR] Error processing message: {e}")


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message

if __name__ == "__main__":
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()