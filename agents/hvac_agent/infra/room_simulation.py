import json
import time
import math
import random
import threading
from datetime import datetime
import paho.mqtt.client as mqtt

# --- Configuration ---
BROKER = "broker.emqx.io"
PORT = 8084
TOPIC_SENSORS = "scada-i-demo/sensors"
TOPIC_CONTROL = "scada-i-demo/control" # The agent publishes here

# Physics Constants
INSULATION_FACTOR = 0.05
HEAT_PER_PERSON = 0.015
AC_COOLING_RATE = {'OFF': 0.0, 'LOW': 0.1, 'MEDIUM': 0.3, 'HIGH': 0.6}
AC_POWER_KW = {'OFF': 0.0, 'LOW': 1.2, 'MEDIUM': 2.0, 'HIGH': 3.5}

# Live Room State
room_temp = 28.0 
agent_target_temp = None
agent_fan_speed = "OFF"
agent_mode = "OFF"
ac_control_reason = "Default/Idle"

# --- MQTT Callbacks ---
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"✅ Connected to MQTT Broker ({BROKER}:{PORT})")
        client.subscribe(TOPIC_CONTROL)
        print(f"🎧 Listening for Agent Commands on: {TOPIC_CONTROL}")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_message(client, userdata, msg):
    global agent_target_temp, agent_fan_speed, agent_mode, ac_control_reason
    try:
        payload = json.loads(msg.payload.decode())
        print(f"\n⚡ AGENT COMMAND RECEIVED:\n{json.dumps(payload, indent=2)}")
        
        # Apply the agent's commands to the room state
        if payload.get("target_temperature_c") is not None:
            agent_target_temp = float(payload["target_temperature_c"])
        
        if payload.get("fan_speed") is not None:
            agent_fan_speed = str(payload["fan_speed"]).upper()
            
        if payload.get("mode") is not None:
            agent_mode = str(payload["mode"]).upper()
            
        ac_control_reason = "Agent Override"
        
    except Exception as e:
        print(f"Failed to parse agent command: {e}")

# --- Physics & Environment Simulation ---
def calculate_physics(current_time):
    global room_temp
    
    # 1. Simulate Outside Weather
    hour = current_time.hour + current_time.minute / 60.0
    out_temp = 28.0 - 6.0 * math.cos((hour - 3) * math.pi / 12) + random.uniform(-0.5, 0.5)
    out_hum = max(40.0, min(100.0, 100 - ((out_temp - 22) * 3) + random.uniform(-5, 5)))
    condition = "Rainy" if out_hum > 85 else "Sunny" if out_hum < 65 else "Cloudy"
    
    # 2. Simulate Occupancy (Randomized slightly for realism)
    occ_count = random.randint(5, 15) if 9 <= hour <= 18 else random.randint(0, 2)
    is_occ = 1 if occ_count > 0 else 0
    
    # 3. Apply Agent AC Commands to Physics
    delta_leak = INSULATION_FACTOR * (out_temp - room_temp)
    delta_people = occ_count * HEAT_PER_PERSON
    
    delta_ac = 0.0
    if agent_fan_speed != 'OFF' and agent_target_temp is not None:
        if room_temp > agent_target_temp:
            # AC cools the room down towards the target
            delta_ac = min(AC_COOLING_RATE.get(agent_fan_speed, 0.3), room_temp - agent_target_temp)
    
    room_temp = room_temp + delta_leak + delta_people - delta_ac
    
    # Calculate Power
    power_kw = AC_POWER_KW.get(agent_fan_speed, 0.0) + (0.2 + (occ_count * 0.05) if is_occ else 0.0)
    
    return {
        "timestamp": current_time.isoformat() + "+08:00",
        "hour_of_day": current_time.hour,
        "day_of_week": current_time.weekday() + 1,
        "day_of_year": current_time.timetuple().tm_yday,
        "outside_temp": round(out_temp, 2),
        "outside_humidity": round(out_hum, 2),
        "weather_condition": condition,
        "occupancy_count": occ_count,
        "is_occupied": is_occ,
        "room_temp": round(room_temp, 2),
        "power_kw": round(power_kw, 2),
        "fan_speed": agent_fan_speed,
        "ac_temp_setting": str(agent_target_temp) if agent_target_temp else "OFF",
        "ac_control_reason": ac_control_reason
    }

# --- Main Setup ---
def start_simulation():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, transport="websockets")
    client.tls_set() # Required for wss://
    client.ws_set_options(path="/mqtt")
    
    client.on_connect = on_connect
    client.on_message = on_message
    
    print("Connecting to broker...")
    client.connect(BROKER, PORT, keepalive=60)
    
    # Start MQTT listening thread
    client.loop_start()
    
    try:
        while True:
            current_time = datetime.now()
            
            # Generate current room physics
            sensor_data = calculate_physics(current_time)
            
            # Publish to EMQX
            client.publish(TOPIC_SENSORS, json.dumps(sensor_data))
            print(f"📊 Published Sensor Data | Room Temp: {sensor_data['room_temp']}°C | AC Target: {sensor_data['ac_temp_setting']} | Fan: {sensor_data['fan_speed']}")
            
            # Tick every 5 seconds
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\nSimulation stopped by user.")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    start_simulation()