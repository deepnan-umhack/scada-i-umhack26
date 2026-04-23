
---

# 📄 README.md

```md
# HVAC Agent System (SCADA-i)

An AI-powered HVAC control system for smart buildings, combining rule-based control, MQTT-based device communication, and a LangGraph-powered agent for intelligent decision-making.

---

## 🚀 Overview

This project simulates a smart HVAC system that can:

- Handle user temperature override requests
- Automatically optimize energy usage (pre-cooling, scheduling)
- Enforce ESG policy constraints
- Communicate with simulated devices via MQTT
- Integrate with an AI agent for natural-language interaction

---

## 🧠 Architecture

```

User / Orchestrator
↓
HVAC Agent (LangGraph)
↓
Tool (run_hvac_request)
↓
Service Layer
↓
Controller (Decision Logic)
↓
Infra (MQTT, DB, Device Simulator)

```

---

## 📁 Project Structure

```

agents/     → AI agent + tools (LangGraph, prompts)
core/       → HVAC logic (controller, service, schemas)
infra/      → MQTT, scheduler, DB, simulators
demo/       → demo scripts (system-trigger scenarios)
test/       → test cases (unit + integration)
archive/    → deprecated / prototype files
main.py     → system entry point

````

---

## ⚙️ Features

### 1. Manual Override
- Users can set room temperature
- System enforces allowed range
- Temporarily pauses optimizer

### 2. Energy Optimization
- Pre-cooling before bookings
- Automatic HVAC adjustments
- Uses MQTT-based optimizer

### 3. Optimizer Pause Logic
- Manual overrides pause automation
- Prevents conflicting actions

### 4. Device Simulation
- MQTT-based HVAC command simulation
- Supabase-backed state updates

---

## 🧪 How to Run

### 1. Install dependencies

```bash
pip install -r requirements.txt
````

---

### 2. Set environment variables

Create a `.env` file:

```
MQTT_BROKER=broker.emqx.io
MQTT_PORT=8084
OPENAI_API_KEY=your_api_key_here
```

---

### 3. Run main entry

```bash
python main.py
```

---

### 4. Run tests

```bash
python test/test_hvac_agent.py
python test/test_optimizer_integration.py
```

---

## 🔌 Key Entry Points

### HVAC Agent (for orchestrator)

```python
from agents.hvac_agent import hvac_agent

result = await hvac_agent({
    "user_id": "user123",
    "room_id": "Huddle Room 1",
    "request_type": "SET_TEMPERATURE",
    "requested_temperature_c": 24.0
})
```

---

## 📡 MQTT Topics

| Purpose            | Topic                       |
| ------------------ | --------------------------- |
| HVAC Commands      | `scadai/hvac/control`       |
| Optimizer Request  | `scadai/optimizer/request`  |
| Optimizer Response | `scadai/optimizer/response` |
| Sensor Replay      | `scadai/room_state/replay`  |

---

## 🧩 Example Output

```
Request ID: xxx
Action: SET_HVAC
Reason: Requested temperature is within allowed range.
Execution Status: sent
Applied Temp: 24.0°C
Fan Speed: HIGH
Mode: COOL
```

---

## 🔄 Demo Scenarios

* Manual override → HVAC adjusts
* Override → optimizer blocked
* System-trigger → optimizer runs
* Pre-cooling before booking

Run:

```bash
python demo/demo_system_triggers.py
```

---

## 🧱 Future Improvements

* Multi-agent orchestration (Booking, ESG agents)
* API layer (FastAPI)
* Dashboard UI
* Real IoT device integration
* Persistent optimizer state

---

## 👥 Team / Usage

Designed for:

* Smart building management systems
* IoT + AI integration demos
* Hackathon prototypes (SCADA-i)

---

## 📌 Notes

* `archive/` contains deprecated prototypes
* system uses mock optimizer (LightGBM simulation)
* all flows are testable locally
