import asyncio
import asyncpg
import os
import json
from typing import Optional, List
from dotenv import load_dotenv

from pydantic import BaseModel, Field
from langchain_core.tools import tool

# Load env
load_dotenv()
DATABASE_URL = os.getenv("POSTGRES_URL")

# ------------------------------------------------------------------
# 1. Pydantic Schemas (V2 Compliant)
# ------------------------------------------------------------------
class GetDepartmentsInput(BaseModel):
    search_keyword: Optional[str] = Field(
        default=None, 
        description="Optional keyword to filter departments by name or description. Leave null to fetch the complete list."
    )

class DepartmentInfo(BaseModel):
    id: str
    name: str
    description: str
    contact_info: Optional[str] = None

class DepartmentResult(BaseModel):
    status: str
    departments: List[DepartmentInfo] = []
    message: Optional[str] = None

# ------------------------------------------------------------------
# 2. Database Query
# ------------------------------------------------------------------
async def _query_departments(search_keyword: Optional[str]) -> List[dict]:
    """Return list of departments from DB. NO LIMIT applied so the agent sees everything."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if search_keyword:
            # If the agent decides to filter
            query = """
                SELECT id, name, description, contact_info 
                FROM departments 
                WHERE name ILIKE $1 OR description ILIKE $1
                ORDER BY name ASC
            """
            rows = await conn.fetch(query, f"%{search_keyword}%")
        else:
            # Default: Dump the whole list (No LIMIT)
            query = """
                SELECT id, name, description, contact_info 
                FROM departments 
                ORDER BY name ASC
            """
            rows = await conn.fetch(query)
            
        results = []
        for r in rows:
            results.append({
                "id": str(r["id"]),
                "name": r["name"],
                "description": r["description"],
                "contact_info": r.get("contact_info"),
            })
        return results
    finally:
        await conn.close()

# ------------------------------------------------------------------
# 3. Main Tool Logic
# ------------------------------------------------------------------
@tool(args_schema=GetDepartmentsInput)
async def get_university_departments_tool(search_keyword: Optional[str] = None) -> str:
    """
    Retrieves the complete catalog of all university departments.
    Returns their exact names, descriptions of what they handle, contact info, and their UUIDs.
    Use this tool to reason about which department a student should contact for event approvals.
    """
    if not DATABASE_URL:
        return DepartmentResult(
            status="error", 
            departments=[], 
            message="Critical Error: DATABASE_URL is not configured."
        ).model_dump_json()

    try:
        # Directly query the database
        departments = await _query_departments(search_keyword)
        
        if not departments:
            return DepartmentResult(
                status="no_departments_found", 
                departments=[], 
                message="No departments found in the database."
            ).model_dump_json()

        # Convert dictionaries to Pydantic objects for clean serialization
        dept_objs = [DepartmentInfo(**d) for d in departments]
        
        return DepartmentResult(
            status="success", 
            departments=dept_objs
        ).model_dump_json()
        
    except Exception as e:
        return DepartmentResult(
            status="error", 
            departments=[], 
            message=f"Database error: {e}"
        ).model_dump_json()

# ------------------------------------------------------------------
# 4. Local Testing
# ------------------------------------------------------------------
if __name__ == "__main__":
    async def main():
        print("--- Testing Get Departments Tool ---")
        
        # Test 1: Fetching ALL departments
        sample_all = {
            "search_keyword": None
        }
        
        result = await get_university_departments_tool.ainvoke(sample_all)
        
        try:
            parsed_result = json.loads(result)
            print(f"Status: {parsed_result['status']}")
            print(f"Total Departments Found: {len(parsed_result['departments'])}")
            
            # Print the first two just to verify structure
            if parsed_result['departments']:
                print("\nSample Data:")
                print(json.dumps(parsed_result['departments'][:2], indent=2))
                
        except Exception as e:
            print("Raw Response:", result)

    # Run the async test loop
    asyncio.run(main())