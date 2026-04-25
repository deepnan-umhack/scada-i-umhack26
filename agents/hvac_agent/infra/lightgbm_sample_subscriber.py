import json
import os
import ssl

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()


MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8084"))
MQTT_WS_PATH = os.getenv("MQTT_WS_PATH", "/mqtt")
MQTT_TRANSPORT = os.getenv("MQTT_TRANSPORT", "websockets").lower()

MQTT_TOPIC_OPTIMIZER_REQUEST = os.getenv(
    "MQTT_TOPIC_OPTIMIZER_REQUEST",
    "scadai/hvac/optimizer/request"
)
MQTT_TOPIC_OPTIMIZER_RESPONSE = os.getenv(
    "MQTT_TOPIC_OPTIMIZER_RESPONSE",
    "scadai/hvac/optimizer/response"
)

print("[OPTIMIZER STARTUP] MQTT_BROKER =", MQTT_BROKER)
print("[OPTIMIZER STARTUP] MQTT_PORT =", MQTT_PORT)
print("[OPTIMIZER STARTUP] MQTT_TRANSPORT =", MQTT_TRANSPORT)
print("[OPTIMIZER STARTUP] MQTT_WS_PATH =", MQTT_WS_PATH)
print("[OPTIMIZER STARTUP] REQUEST TOPIC =", MQTT_TOPIC_OPTIMIZER_REQUEST)
print("[OPTIMIZER STARTUP] RESPONSE TOPIC =", MQTT_TOPIC_OPTIMIZER_RESPONSE)

def run_lightgbm_inference(payload: dict) -> dict:
    # Replace this section with real model inference later
    current_temp = payload["current_temperature_c"]
    min_temp = payload["min_allowed_temperature_c"]
    current_setpoint = payload["current_setpoint_c"]
    mode = payload["optimization_mode"]

    if mode == "PRE_COOLING":
        recommended_temp = max(min_temp, 23.0)
        recommended_fan = "HIGH" if current_temp > 27 else "MEDIUM"
        reason = "Pre-cooling optimization applied."
    else:
        recommended_temp = max(min_temp, 24.0) if current_temp > 26 else current_setpoint
        recommended_fan = "MEDIUM" if current_temp > 26 else payload["current_fan_speed"]
        reason = "Normal optimization applied."

    return {
        "request_id": payload["request_id"],
        "room_id": payload["room_id"],
        "recommended_temperature_c": recommended_temp,
        "recommended_fan_speed": recommended_fan,
        "recommended_mode": "COOL",
        "model_name": f"lightgbm_{payload['room_id']}",
        "status": "success",
        "reason": reason,
    }


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[OPTIMIZER] Connected to MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_OPTIMIZER_REQUEST)
        print(f"[OPTIMIZER] Subscribed to {MQTT_TOPIC_OPTIMIZER_REQUEST}")
    else:
        print(f"[OPTIMIZER] Connection failed with code {rc}")


def on_disconnect(client, userdata, flags, rc, properties=None):
    print(f"[OPTIMIZER] Disconnected with code {rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except Exception as e:
        print(f"[OPTIMIZER] Failed to decode message: {e}")
        return

    print("\n[OPTIMIZER] Received request:")
    print(payload)

    try:
        response = run_lightgbm_inference(payload)
    except Exception as e:
        response = {
            "request_id": payload.get("request_id"),
            "room_id": payload.get("room_id"),
            "recommended_temperature_c": payload.get("current_setpoint_c", 24.0),
            "recommended_fan_speed": payload.get("current_fan_speed", "MEDIUM"),
            "recommended_mode": payload.get("current_mode", "COOL"),
            "model_name": f"lightgbm_{payload.get('room_id', 'unknown')}",
            "status": "failed",
            "reason": f"Inference error: {e}",
        }

    result = client.publish(MQTT_TOPIC_OPTIMIZER_RESPONSE, json.dumps(response))

    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print("\n[OPTIMIZER] Published response:")
        print(response)
    else:
        print(f"[OPTIMIZER] Failed to publish response, rc={result.rc}")


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    transport=MQTT_TRANSPORT
)
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message

if MQTT_TRANSPORT == "websockets":
    client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
    client.ws_set_options(path=MQTT_WS_PATH)

client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()