import json

import paho.mqtt.client as mqtt

from agents.hvac_agent.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC_SENSOR_REPLAY
from agents.hvac_agent.infra.postgres_client import execute, run


def upsert_room_state(payload: dict):
    row = {
        "room_id": payload["room_id"],
        "temperature_c": payload["temperature_c"],
        "humidity_percent": payload["humidity_percent"],
        "occupied": payload["occupied"],
        "occupancy_count": payload["occupancy_count"],
        "last_updated": payload["timestamp"],
    }

    return run(
        execute(
            """
            INSERT INTO room_state (
                room_id,
                temperature_c,
                humidity_percent,
                occupied,
                occupancy_count,
                last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (room_id)
            DO UPDATE SET
                temperature_c = EXCLUDED.temperature_c,
                humidity_percent = EXCLUDED.humidity_percent,
                occupied = EXCLUDED.occupied,
                occupancy_count = EXCLUDED.occupancy_count,
                last_updated = EXCLUDED.last_updated
            """,
            row["room_id"],
            row["temperature_c"],
            row["humidity_percent"],
            row["occupied"],
            row["occupancy_count"],
            row["last_updated"],
        )
    )


def upsert_hvac_state(payload: dict):
    row = {
        "room_id": payload["room_id"],
        "current_setpoint_c": payload["current_setpoint_c"],
        "fan_speed": payload["fan_speed"],
        "mode": payload["mode"],
        "ac_on": payload["ac_on"],
        "updated_at": payload["timestamp"],
    }

    return run(
        execute(
            """
            INSERT INTO hvac_state (
                room_id,
                current_setpoint_c,
                fan_speed,
                mode,
                ac_on,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (room_id)
            DO UPDATE SET
                current_setpoint_c = EXCLUDED.current_setpoint_c,
                fan_speed = EXCLUDED.fan_speed,
                mode = EXCLUDED.mode,
                ac_on = EXCLUDED.ac_on,
                updated_at = EXCLUDED.updated_at
            """,
            row["room_id"],
            row["current_setpoint_c"],
            row["fan_speed"],
            row["mode"],
            row["ac_on"],
            row["updated_at"],
        )
    )


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