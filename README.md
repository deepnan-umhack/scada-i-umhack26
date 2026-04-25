# SCADA-i by Team DEEP NaN (UMHackathon 2026)

![Frontend Checks](https://github.com/deepnan-umhack/scada-i-umhack26/actions/workflows/frontend-checks.yml/badge.svg)
![Regression Test](https://github.com/deepnan-umhack/scada-i-umhack26/actions/workflows/regression.yml/badge.svg)
![Test Coverage](https://github.com/deepnan-umhack/scada-i-umhack26/actions/workflows/test-converage.yml/badge.svg)
![Unit Tests & Guardrail Safety](https://github.com/deepnan-umhack/scada-i-umhack26/actions/workflows/unit-tests.yml/badge.svg)

* **Web Dashboard:** [https://scada-i.netlify.app/dashboard](https://scada-i.netlify.app/dashboard)
* **Mobile Application:** [https://deep-nan.netlify.app/](https://deep-nan.netlify.app/)

An AI-powered, multi-agent control system for smart buildings. SCADA-i combines rule-based control, MQTT-based IoT device communication, a React web dashboard, a mobile application, and a LangGraph-powered multi-agent system for intelligent decision-making, booking management, and ESG (Environmental, Social, and Governance) compliance.

---

## Table of Contents
- [System Overview](#system-overview)
- [Repository Structure](#repository-structure)
- [How to Run](#how-to-run)
- [MQTT Topics](#mqtt-topics)
- [Testing and Demos](#testing-and-demos)

---

## System Overview

The system orchestrates different components to manage smart buildings autonomously and through natural language interaction. 

### The Multi-Agent System (LangGraph)
* **Orchestrator (`agents/orchestrator/`)**: The main supervisor agent that routes user queries and system events to the appropriate sub-agents.
* **HVAC Agent (`agents/hvac_agent/`)**: Handles temperature overrides, automatically optimizes energy usage (pre-cooling, scheduling), and communicates with simulated HVAC devices via MQTT.
* **Booking Agent (`agents/booking_agent/`)**: Manages room and equipment availability, creates and updates booking records, and handles user schedules.
* **ESG Agent (`agents/esg_agent/`)**: Analyzes space utilization, calculates carbon offset costs, retrieves building policies via PDF ingestion, and analyzes HVAC compliance.

### Dashboard & Mobile App
* **Web Dashboard (`dashboard/scada-i-react/`)**: Features real-time analytics based on IoT data streams, dedicated pages for viewing ESG reports, booking statuses, and live occupancy feed.
* **Mobile Application (`website/`)**: The mobile-facing application for user interactions on the go.

### Infrastructure & Simulation
* **Device Simulation**: MQTT-based HVAC command simulators and data replay scripts (`data_replay/replay_scada.py` using `room_sensor_history.csv`).
* **State Management**: PostgreSQL/Supabase clients track device states and agent histories.

---

## Repository Structure

```text
scada-i-umhack26/
├── .github/workflows/  → CI/CD pipelines and coverage tests
├── agents/             → Python-based AI agents (LangGraph)
│   ├── api.py          → API entry point for agent interaction
│   ├── booking_agent/  → Tools for scheduling and resource availability
│   ├── esg_agent/      → ESG compliance, reporting, and policy RAG
│   ├── hvac_agent/     → Core HVAC logic, MQTT simulators, and optimization
│   └── orchestrator/   → Supervisor agent coordinating the sub-agents
├── dashboard/          → Main web dashboard application
│   └── scada-i-react/  → React + Vite frontend
├── website/            → Mobile application interface
├── data_replay/        → Sensor data history and MQTT replay scripts
└── uv.lock / package.json → Dependency management files
```

---

## How to Run

> **Note:** It is highly recommended to use the **Live Demos** linked at the top of this document instead of setting up the project locally. 

If you need to run the system locally for development purposes, follow the steps below.

### 1. Web Dashboard

```bash
# Navigate to the dashboard directory
cd dashboard/scada-i-react

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 2. Mobile Application

```bash
# Navigate to the mobile application directory
cd website

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. AI Agents & Backend (Python)

The backend uses Python and modern dependency management (compatible with `uv` or `pip`).

```bash
# Navigate to the agents directory
cd agents

# Install dependencies (using pip or uv)
pip install -r requirements.txt
# OR if using uv
uv sync
```

**Environment Variables:**
Create a `.env` file in the `agents/` or `agents/hvac_agent/` directory:
```env
MQTT_BROKER=broker.emqx.io
MQTT_PORT=8084
OPENAI_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

**Run the System:**
```bash
# Start the API / main agent system
python api.py

# Or specifically for HVAC standalone:
python hvac_agent/main.py
```

---

## MQTT Topics

The system communicates with simulated devices using the following MQTT topics:

| Purpose            | Topic                       |
| ------------------ | --------------------------- |
| HVAC Commands      | `scadai/control`       |
| Optimizer Request  | `scadai/optimizer/request`  |
| Optimizer Response | `scadai/optimizer/response` |
| Sensor Replay      | `scadai/sensor`  |

---

## Testing and Demos

**Run tests via Pytest:**
```bash
# Run all tests configured in pytest.ini
pytest

# Run specific HVAC agent tests
cd agents/hvac_agent
python -m pytest tests/
```

**Run Demo Scenarios:**
You can test local trigger scenarios for the HVAC system (override → optimizer blocked, pre-cooling before booking, etc.):
```bash
python agents/hvac_agent/demo/demo_system_triggers.py
```

**Run Data Replay:**
Simulate historical room sensor data flowing into the system:
```bash
python data_replay/replay_scada.py
```
