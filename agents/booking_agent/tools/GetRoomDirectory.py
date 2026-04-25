import asyncio
import asyncpg
import os
import json
from typing import Optional, List, Union
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field
from langchain_core.tools import tool

load_dotenv(find_dotenv())
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Pydantic Schema
# ------------------------------------------------------------------
class GetRoomDirectoryInput(BaseModel):
    min_capacity: int = Field(1, description="Minimum capacity required.")
    room_type: Optional[str] = Field(None, description="Optional type of room (e.g., 'boardroom', 'huddle', 'auditorium').")
    required_features: Optional[List[str]] = Field(None, description="Optional list of required features (e.g., ['projector', 'whiteboard']).")
    limit: int = Field(5, description="Max number of rooms to return.")

# ------------------------------------------------------------------
# 2. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=GetRoomDirectoryInput)
async def get_room_directory_tool(
    min_capacity: int = 1,
    room_type: Optional[str] = None,
    required_features: Optional[List[str]] = None,
    limit: int = 10
) -> str:
    """
    Retrieves a summary of the TYPES of rooms available in the building.
    Does NOT check time availability. Use this when the user asks general questions about room types or features.
    """
    if not DATABASE_URL:
        return json.dumps({"status": "error", "message": "DATABASE_URL is not configured."})

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # We removed the LIMIT here so we can see ALL rooms to group them properly
        query = """
            SELECT id, name, capacity, type, description, features 
            FROM rooms 
            WHERE capacity >= $1
        """
        args = [min_capacity]
        param_idx = 2

        if room_type:
            query += f" AND type ILIKE ${param_idx}"
            args.append(f"%{room_type}%")
            param_idx += 1

        rows = await conn.fetch(query, *args)
        
        if not rows:
            return json.dumps({"status": "no_rooms", "message": "No room types match this criteria."})

        # 1. Parse and filter the raw rooms
        valid_rooms = []
        for r in rows:
            features = r["features"]
            if isinstance(features, str):
                try:
                    features = json.loads(features)
                except Exception:
                    features = []
            elif not features:
                features = []
            
            # Python-side feature filtering
            if required_features:
                if not set(required_features).issubset(set(features)):
                    continue # Skip this room if it doesn't have the features
                    
            valid_rooms.append({
                "capacity": r["capacity"],
                "type": r["type"],
                "features": features
            })

        # 2. Aggregate the valid rooms by 'type'
        type_summary = {}
        for r in valid_rooms:
            t = r["type"]
            if t not in type_summary:
                type_summary[t] = {
                    "room_type": t,
                    "total_rooms_of_this_type": 0,
                    "max_capacity": r["capacity"],
                    "all_available_features": set(r["features"])
                }
            
            type_summary[t]["total_rooms_of_this_type"] += 1
            
            # Find the largest room in this category
            if r["capacity"] > type_summary[t]["max_capacity"]:
                type_summary[t]["max_capacity"] = r["capacity"]
                
            # Combine all features found in this room type
            type_summary[t]["all_available_features"].update(r["features"])

        # 3. Format for the AI and apply the limit
        final_types = []
        for t, data in type_summary.items():
            data["all_available_features"] = list(data["all_available_features"]) # Sets are not JSON serializable
            final_types.append(data)
            
        # Apply the limit to the number of TYPES returned
        safe_limit = min(limit, 10)
        final_types = final_types[:safe_limit]

        return json.dumps({"status": "success", "available_types": final_types})

    except Exception as e:
        return json.dumps({"status": "error", "message": f"Database error: {str(e)}"})
    finally:
        await conn.close()

# ------------------------------------------------------------------
# 3. Local Testing
# ------------------------------------------------------------------
if __name__ == "__main__":
    async def run_tests():
        print("--- Testing Get Room Directory Tool ---")
        
        # Test 1: Broad search for any room holding at least 4 people
        test_payload_1 = {
            "min_capacity": 4,
            "limit": 3
        }

        print(f"\n[Test 1] Searching for any room with capacity >= {test_payload_1['min_capacity']}...")
        result1 = await get_room_directory_tool(**test_payload_1)
        
        try:
            print(json.dumps(json.loads(result1), indent=2))
        except:
            print("Response 1:", result1)

        # Test 2: Specific search for a boardroom with a projector
        test_payload_2 = {
            "min_capacity": 8,
            "room_type": "boardroom",
            "required_features": ["projector"],
            "limit": 5
        }

        print(f"\n[Test 2] Searching for a '{test_payload_2['room_type']}' with {test_payload_2['required_features']}...")
        result2 = await get_room_directory_tool(**test_payload_2)
        
        try:
            print(json.dumps(json.loads(result2), indent=2))
        except:
            print("Response 2:", result2)

    # Run the async test loop
    asyncio.run(run_tests())