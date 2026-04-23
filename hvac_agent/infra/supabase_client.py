from pathlib import Path
from dotenv import load_dotenv
import os
from supabase import create_client, Client

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

print("[SUPABASE][INFRA] URL =", SUPABASE_URL)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)