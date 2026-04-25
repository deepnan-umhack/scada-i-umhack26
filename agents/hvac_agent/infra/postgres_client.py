import asyncio
import threading
from typing import Any

import asyncpg

from agents.hvac_agent.config import POSTGRES_URL


def _database_url() -> str:
    if not POSTGRES_URL:
        raise ValueError("POSTGRES_URL is not configured")
    return POSTGRES_URL


async def fetch_rows(query: str, *args: Any) -> list[dict]:
    conn = await asyncpg.connect(_database_url())
    try:
        rows = await conn.fetch(query, *args)
        return [dict(row) for row in rows]
    finally:
        await conn.close()


async def fetch_one(query: str, *args: Any) -> dict | None:
    conn = await asyncpg.connect(_database_url())
    try:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None
    finally:
        await conn.close()


async def execute(query: str, *args: Any) -> str:
    conn = await asyncpg.connect(_database_url())
    try:
        return await conn.execute(query, *args)
    finally:
        await conn.close()


def run(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    result: dict[str, Any] = {}

    def _runner():
        try:
            result["value"] = asyncio.run(coro)
        except Exception as exc:  # pragma: no cover - re-raised in caller thread
            result["error"] = exc

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
    thread.join()

    if "error" in result:
        raise result["error"]

    return result.get("value")
