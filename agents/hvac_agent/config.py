from pathlib import Path
from dotenv import load_dotenv
import os


ROOT_DIR = Path(__file__).resolve().parent
SHARED_ENV_PATH = ROOT_DIR.parent / ".env"  # /agents/.env
LOCAL_ENV_PATH = ROOT_DIR / ".env"  # /agents/hvac_agent/.env

if SHARED_ENV_PATH.exists():
    load_dotenv(SHARED_ENV_PATH)
load_dotenv(LOCAL_ENV_PATH)


def _get_env(name: str, default=None, required: bool = False):
    val = os.getenv(name, default)
    if required and (val is None or val == ""):
        raise ValueError(f"Missing {name} in environment")
    return val


def _get_first_env(*names: str, default=None, required: bool = False):
    for name in names:
        value = os.getenv(name)
        if value not in (None, ""):
            return value

    if required:
        raise ValueError(f"Missing one of: {', '.join(names)} in environment")

    return default


# LLM settings
# ILMU_API_KEY = _get_first_env("Z_AI_API_KEY", "ILMU_API_KEY", required=True)
# ILMU_MODEL = _get_first_env("Z_AI_MODEL", "ILMU_MODEL", default="ilmu-glm-5.1")
# ILMU_BASE_URL = _get_first_env("Z_AI_BASE_URL", "ILMU_BASE_URL", default="https://api.ilmu.ai/v1")


# Postgres
POSTGRES_URL = _get_env("POSTGRES_URL", _get_env("DATABASE_URL", ""))


# MQTT / Ingestor
MQTT_BROKER = _get_env("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(_get_env("MQTT_PORT", "1883"))
MQTT_TOPIC_SENSOR_REPLAY = _get_env("MQTT_TOPIC_SENSOR_REPLAY", "scadai/room_state/replay")
