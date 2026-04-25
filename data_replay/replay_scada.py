import time
import json
import ssl
import os
from datetime import datetime
import paho.mqtt.client as mqtt
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TABLE_NAME = "room_sensor_history" 
TIMESTAMP_COLUMN = "timestamp" 

MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 8084
MQTT_TOPIC = "scada-i-demo/sensors"
PUBLISH_INTERVAL = 5 

BATCH_SIZE = 1000 

print("Initializing Supabase client...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print(f"Connecting to MQTT Broker...")
client = mqtt.Client(transport="websockets")
client.tls_set(cert_reqs=ssl.CERT_REQUIRED) 
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

def parse_text_timestamp(row):
    """
    Tries to parse the timestamp. If the date is invalid (like Feb 29 2026),
    it falls back to a neutral date to keep the script running.
    """
    date_str = row.get(TIMESTAMP_COLUMN)
    if not date_str:
        return datetime.max
    
    # Clean string: remove extra spaces
    date_str = date_str.strip()
    
    try:
        # Standard parsing
        return datetime.strptime(date_str, "%d/%m/%Y %H:%M")
    except ValueError:
        # If it's an invalid leap year date like 29/2/2026, 
        # we force it to March 1st 2026 just for the sake of sorting order.
        if "29/2/2026" in date_str:
            return datetime(2026, 3, 1, 0, 0)
        
        print(f"⚠️ Skipping invalid date format/value: {date_str}")
        return datetime.max # Push unknown formats to the end

def fetch_sort_and_publish():
    all_records = []
    offset = 0
    
    print("\n1. Fetching all data from Supabase...")
    while True:
        response = supabase.table(TABLE_NAME).select("*").range(offset, offset + BATCH_SIZE - 1).execute()
        records = response.data
        if not records: break
        all_records.extend(records)
        offset += BATCH_SIZE
        print(f"   Fetched {len(all_records)} rows...")

    # 2. Sorting with the improved parser
    print("\n2. Sorting data chronologically...")
    all_records.sort(key=parse_text_timestamp)

    # 3. Replay
    print("\n3. Starting MQTT Broadcast...")
    for i, row in enumerate(all_records):
        payload = json.dumps(row)
        client.publish(MQTT_TOPIC, payload)
        print(f"[#{i+1}] {row.get(TIMESTAMP_COLUMN)} -> {MQTT_TOPIC}")
        time.sleep(PUBLISH_INTERVAL)

if __name__ == "__main__":
    try:
        fetch_sort_and_publish()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        client.loop_stop()
        client.disconnect()