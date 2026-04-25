# toolkit.py
from esg_agent.tools.FetchEnergyData import fetch_energy_data_tool
from esg_agent.tools.GenerateEsgReport import generate_esg_report_tool
from esg_agent.tools.AnalyzeSpaceUtilization import analyze_space_utilization_tool
from esg_agent.tools.AnalyzeHvacCompliance import analyze_hvac_compliance_tool
from esg_agent.tools.CalculateCarbonOffsetCost import calculate_carbon_offset_cost_tool
from esg_agent.tools.PolicyRetriever import search_esg_policy_tool

ESG_TOOLS = [
    fetch_energy_data_tool,
    generate_esg_report_tool,
    analyze_space_utilization_tool,
    analyze_hvac_compliance_tool,
    calculate_carbon_offset_cost_tool,
    search_esg_policy_tool,
]