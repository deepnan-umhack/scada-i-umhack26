import asyncio
import asyncpg
import os
import json
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from uuid import UUID

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")


class GetRoomUuidInput(BaseModel):
    room_name_or_id: str = Field(..., description="Room name or room UUID to resolve.")


@tool(args_schema=GetRoomUuidInput)
async def get_room_uuid_tool(room_name_or_id: str) -> str:
    """Resolves a room name to its database UUID."""
    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    normalized_room_name = room_name_or_id.replace("_", " ").strip()

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        try:
            UUID(str(room_name_or_id))
            row = await conn.fetchrow(
                """
                SELECT id, name
                FROM rooms
                WHERE id = $1
                LIMIT 1
                """,
                str(room_name_or_id),
            )
            if row is not None:
                return json.dumps(
                    {
                        "status": "success",
                        "room_id": str(row["id"]),
                        "room_name": row["name"],
                        "message": "Room UUID resolved successfully.",
                    }
                )
        except ValueError:
            pass

        row = await conn.fetchrow(
            """
            SELECT id, name
            FROM rooms
            WHERE LOWER(name) = LOWER($1)
            LIMIT 1
            """,
            normalized_room_name,
        )

        if row is None:
            return json.dumps(
                {
                    "status": "not_found",
                    "message": f"No room found for identifier/name: {room_name_or_id}",
                }
            )

        return json.dumps(
            {
                "status": "success",
                "room_id": str(row["id"]),
                "room_name": row["name"],
                "message": "Room UUID resolved successfully.",
            }
        )

    except Exception as e:
        return json.dumps({"status": "error", "message": f"Database error: {str(e)}"})
    finally:
        await conn.close()


if __name__ == "__main__":
    async def run_tests():
        test_payload = {"room_name_or_id": "Huddle Room 1"}
        result = await get_room_uuid_tool.ainvoke(test_payload)
        print(result)

    asyncio.run(run_tests())