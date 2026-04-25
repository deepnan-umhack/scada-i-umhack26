import json
import os
import ssl
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from infra.supabase_client import supabase

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8084"))
MQTT_WS_PATH = os.getenv("MQTT_WS_PATH", "/mqtt")
MQTT_TOPIC_HVAC_COMMAND = os.getenv("MQTT_TOPIC_HVAC_COMMAND", "scadai/hvac/control")


def on_connect(client, userdata, flags, rc, properties=None):
    print("[DEVICE] Connected to MQTT broker")
    client.subscribe(MQTT_TOPIC_HVAC_COMMAND)


def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())

    print("\n[DEVICE] Received HVAC command:")
    print(payload)

    room_id = payload["room_id"]

    supabase.table("hvac_state").upsert({
        "room_id": room_id,
        "current_setpoint_c": payload["target_temperature_c"],
        "fan_speed": payload["fan_speed"],
        "mode": payload["mode"],
        "ac_on": True,
        "updated_at": payload["sent_at"]
    }).execute()

    print(f"[DEVICE] AC updated for {room_id}")


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    transport="websockets"
)
client.on_connect = on_connect
client.on_message = on_message

client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
client.ws_set_options(path=MQTT_WS_PATH)

client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()