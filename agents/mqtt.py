import paho.mqtt.client as mqtt
import ssl
import os
from dotenv import load_dotenv

load_dotenv()

BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
PORT = int(os.getenv("MQTT_PORT", "8084"))
WS_PATH = os.getenv("MQTT_WS_PATH", "/mqtt")
TOPIC = os.getenv("MQTT_TOPIC_HVAC_COMMAND", "scada-i-demo/control")

# Callback when connected
def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        print("Connected successfully")
        client.subscribe(TOPIC)
    else:
        print(f"Connection failed with code {reason_code}")

# Callback when message received
def on_message(client, userdata, msg):
    print(f"Received: {msg.payload.decode()} from {msg.topic}")

# Create client (websocket transport to match EMQX 8084 setup)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, transport="websockets")

client.on_connect = on_connect
client.on_message = on_message

# Enable secure WebSocket (wss)
client.tls_set(cert_reqs=ssl.CERT_NONE)
client.tls_insecure_set(True)
client.ws_set_options(path=WS_PATH)

# Connect
client.connect(BROKER, PORT, keepalive=60)

# Infinite loop
client.loop_forever()