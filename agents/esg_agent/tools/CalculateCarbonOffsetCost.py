import json
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class CarbonOffsetInput(BaseModel):
    carbon_emissions_kg: float = Field(..., description="Total estimated carbon emissions in kilograms.")

@tool(args_schema=CarbonOffsetInput)
async def calculate_carbon_offset_cost_tool(carbon_emissions_kg: float) -> str:
    """
    Calculates the financial cost to offset the generated carbon footprint and provides ecological equivalents.
    Use this AFTER fetching the total carbon emissions.
    """
    try:
        # Assuming current market rate of ~$20 USD per Metric Ton (1000 kg)
        # 1 kg = $0.02 USD
        cost_usd = round(carbon_emissions_kg * 0.02, 2)
        
        # Rough conversion rate to MYR (e.g., 1 USD = 4.7 MYR)
        cost_myr = round(cost_usd * 4.7, 2)
        
        # A mature tree absorbs about 22kg of CO2 per year
        trees_needed = round(carbon_emissions_kg / 22, 1)
        
        return json.dumps({
            "status": "success",
            "offset_data": {
                "estimated_cost_usd": cost_usd,
                "estimated_cost_myr": cost_myr,
                "trees_required_to_offset_annually": trees_needed,
                "recommendation": "Purchase verified carbon credits or initiate campus tree-planting drive."
            }
        })
        
    except Exception as e:
        return f"ERROR - Failed to calculate carbon offset: {str(e)}"