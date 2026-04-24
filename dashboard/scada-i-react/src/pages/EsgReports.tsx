import { useState, useEffect } from "react";
import { 
  FileText, Calendar, Download, Plus, X, CheckCircle2, ChevronRight, ChevronDown, Search, LayoutDashboard 
} from "lucide-react";
import { Link } from "react-router-dom";

// --- Mock Data ---
const pastReports = [
  { 
    id: "ESG-202604-FBA3CC", 
    date: "23 April 2026", 
    period: "1 January 2024 – 31 January 2024",
    title: "ESG Building Performance Report", 
    status: "Verified", 
    score: "94", 
    author: "ESG Analytics System" 
  },
  { 
    id: "ESG-2025-Q4", 
    date: "Jan 5, 2026", 
    period: "1 October 2025 – 31 December 2025",
    title: "Q4 2025 Facility Carbon Footprint", 
    status: "Verified", 
    score: "88", 
    author: "Admin" 
  },
];

export default function EsgReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState<typeof pastReports[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulate report generation process
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating && generationProgress < 100) {
      interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsGenerating(false);
              setGenerationProgress(0);
            }, 1000);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, generationProgress]);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
  };

  const filteredReports = pastReports.filter((report) => 
    report.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full pb-6 lg:pb-0 font-sans text-gray-900 bg-transparent min-h-full flex flex-col gap-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm font-medium text-gray-500 mb-2">
            {/* <span className="text-gray-900">PAGES</span> */}
            {/* <ChevronRight size={14} className="text-gray-400" /> */}
            <Link to="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
            <span className="text-gray-400 px-1">•</span>
            <span className="text-indigo-600">ESG Reports</span>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">SCADA-i Generative Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor real-time environment & energy metrics</p>
        </div>
      </div>

      {/* Main Content: Report Archive List */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 lg:px-6 lg:py-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center bg-gray-50/50 gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Report Archive</h3>
          </div>
          
          {/* Actions: Button + Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleGenerateReport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-md transition-all shadow-sm active:scale-95 shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              Generate New Report
            </button>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search by Report ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredReports.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 lg:px-6 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-4 mb-2 sm:mb-0">
                    <div className="p-2 bg-gray-100 text-gray-500 rounded-md group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{report.title}</h4>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-xs font-mono font-medium text-gray-500">
                          {report.id}
                        </span>
                        <span className="hidden sm:inline text-gray-300 text-[10px]">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> {report.date}
                        </span>
                        <span className="hidden sm:inline text-gray-300 text-[10px]">•</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${report.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-2 sm:pt-0 pl-12 sm:pl-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Score</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-gray-900">{report.score}</span>
                        <span className="text-xs font-medium text-gray-400">/100</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No reports found</p>
              <p className="text-xs text-gray-500 mt-1">We couldn't find any reports matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Report Generation Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative mb-6">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40" cy="40" r="36"
                  stroke="currentColor" strokeWidth="4" fill="transparent"
                  className="text-indigo-600 transition-all duration-300 ease-out"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * generationProgress) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {generationProgress === 100 ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />
                ) : (
                  <span className="text-sm font-bold text-indigo-900">{generationProgress}%</span>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {generationProgress === 100 ? "Report Complete" : "Generating ESG Report"}
            </h3>
            <p className="text-sm text-gray-500">
              {generationProgress === 100 
                ? "Finalizing document structure..." 
                : "Aggregating latest IoT sensor data and applying AI compliance checks..."}
            </p>
          </div>
        </div>
      )}

      {/* View Report Full-Screen Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          
          {/* Top Toolbar */}
          <div className="w-full flex justify-between items-center px-4 py-3 md:px-6 absolute top-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500/20 text-blue-400">
                <FileText size={18} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-xl">
                  {selectedReport.title}.pdf
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    {selectedReport.id}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors hidden sm:block" title="Download">
                <Download size={18} />
              </button>
              <div className="w-px h-5 bg-gray-700 hidden sm:block"></div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document Viewer Area */}
          <div 
            className="flex-1 w-full h-full overflow-y-auto flex justify-center items-start pt-20 pb-12 px-4 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:border-4 [&::-webkit-scrollbar-thumb]:border-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500"
            onClick={(e) => {
              // Close if clicking the background, not the document
              if (e.target === e.currentTarget) setSelectedReport(null);
            }}
          >
            {/* The "Paper" Document */}
            <div className="bg-white w-full max-w-4xl shadow-2xl rounded-sm p-8 md:p-16 lg:p-20 shrink-0 flex flex-col animate-in slide-in-from-bottom-8 duration-500 font-serif text-gray-800 leading-relaxed">
               
               {/* Document Header */}
               <div className="border-b-2 border-gray-900 pb-8 mb-8 text-center">
                 <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-6 uppercase">{selectedReport.title}</h1>
                 
                 <div className="grid grid-cols-2 gap-y-3 max-w-2xl mx-auto text-left text-sm">
                    <div className="font-bold text-gray-900">Reporting Period:</div>
                    <div className="text-gray-700">{selectedReport.period}</div>
                    
                    <div className="font-bold text-gray-900">Report ID:</div>
                    <div className="font-mono text-gray-700">{selectedReport.id}</div>
                    
                    <div className="font-bold text-gray-900">Prepared For:</div>
                    <div className="text-gray-700">Building Owner / Facility Management Team</div>
                    
                    <div className="font-bold text-gray-900">Prepared By:</div>
                    <div className="text-gray-700">{selectedReport.author}</div>
                    
                    <div className="font-bold text-gray-900">Generated On:</div>
                    <div className="text-gray-700">{selectedReport.date}</div>
                 </div>
               </div>

               {/* Document Body */}
               <div className="space-y-8 text-[15px]">
                 
                 {/* Section 1 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">1. Executive Summary</h2>
                   <p className="mb-3">This ESG report evaluates the environmental performance and operational efficiency of the building for the reporting period. The building demonstrates strong sustainability performance, with:</p>
                   <ul className="list-disc pl-6 mb-3 space-y-1">
                     <li>High HVAC efficiency (92%)</li>
                     <li>Controlled carbon emissions relative to energy consumption</li>
                     <li>Stable operational sustainability classification (“Optimal” status)</li>
                   </ul>
                   <p>Overall, the building is performing within acceptable ESG benchmarks for commercial facilities, with strong alignment to energy efficiency and emissions management expectations commonly tracked in modern building ESG frameworks.</p>
                 </section>

                 {/* Section 2 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-1">2. Environmental Performance (E)</h2>
                   
                   <div className="space-y-6">
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-2">2.1 Energy Consumption</h3>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Total Energy Consumption:</span> 6,346.20 kWh</p>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Interpretation:</span> This energy usage reflects a moderate consumption profile typical of a mid-sized commercial or mixed-use building. In ESG reporting standards, energy consumption is a primary driver of emissions and operational efficiency assessment.</p>
                       <p className="font-semibold text-gray-900 mb-1">Key observations:</p>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Energy usage appears stable for a one-month reporting cycle</li>
                         <li>No abnormal spikes detected</li>
                         <li>Likely driven by HVAC and base-load operations</li>
                       </ul>
                     </div>

                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-2">2.2 Carbon Footprint</h3>
                       <p className="mb-1"><span className="font-semibold text-gray-900">Total Carbon Emissions:</span> 2,475.02 kg CO₂e</p>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Emissions Intensity:</span> 0.39 kg CO₂e per kWh (approx.)</p>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Interpretation:</span> This emissions intensity is within a typical range for grid-powered commercial buildings depending on regional energy mix. ESG frameworks commonly track Scope 2 emissions from electricity consumption as a core indicator.</p>
                       <p className="font-semibold text-gray-900 mb-1">Key insights:</p>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Emissions closely correlate with energy consumption (expected behavior)</li>
                         <li>No indication of inefficient energy-to-carbon conversion</li>
                         <li>Suggests grid-dependent but controlled energy sourcing</li>
                       </ul>
                     </div>

                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-2">2.3 HVAC Efficiency</h3>
                       <p className="mb-2"><span className="font-semibold text-gray-900">HVAC Efficiency Rating:</span> 92%</p>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Interpretation:</span> A 92% efficiency rating indicates high-performing HVAC systems, suggesting:</p>
                       <ul className="list-disc pl-6 mb-2 space-y-1">
                         <li>Effective temperature regulation</li>
                         <li>Optimized energy-to-comfort ratio</li>
                         <li>Reduced energy wastage from cooling/heating cycles</li>
                       </ul>
                       <p>Modern ESG building frameworks emphasize HVAC efficiency as a critical lever for reducing operational carbon emissions and improving indoor environmental quality.</p>
                     </div>

                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-2">2.4 Sustainability Status</h3>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Status:</span> Optimal</p>
                       <p className="mb-2"><span className="font-semibold text-gray-900">Meaning:</span> This classification indicates that current building operations are:</p>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Within defined sustainability thresholds</li>
                         <li>Operating efficiently relative to energy and emissions benchmarks</li>
                         <li>Not exhibiting critical environmental risk signals</li>
                       </ul>
                     </div>
                   </div>
                 </section>

                 {/* Section 3 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-1">3. Key ESG Indicators Summary</h2>
                   <div className="overflow-hidden border border-gray-300 rounded-md mb-6">
                     <table className="w-full text-left border-collapse bg-white font-sans text-sm">
                       <thead>
                         <tr className="bg-gray-100 border-b border-gray-300">
                           <th className="py-2.5 px-4 font-semibold text-gray-900">Indicator</th>
                           <th className="py-2.5 px-4 font-semibold text-gray-900">Value</th>
                           <th className="py-2.5 px-4 font-semibold text-gray-900">Assessment</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200">
                         <tr>
                           <td className="py-2.5 px-4 font-medium text-gray-900">Final ESG Score</td>
                           <td className="py-2.5 px-4 text-indigo-700 font-bold">{selectedReport.score} / 100</td>
                           <td className="py-2.5 px-4 text-gray-700">Excellent performance</td>
                         </tr>
                         <tr className="bg-gray-50/50">
                           <td className="py-2.5 px-4 font-medium text-gray-900">Energy Consumption</td>
                           <td className="py-2.5 px-4 text-gray-700">6,346.20 kWh</td>
                           <td className="py-2.5 px-4 text-gray-700">Normal operational range</td>
                         </tr>
                         <tr>
                           <td className="py-2.5 px-4 font-medium text-gray-900">Carbon Emissions</td>
                           <td className="py-2.5 px-4 text-gray-700">2,475.02 kg CO₂e</td>
                           <td className="py-2.5 px-4 text-gray-700">Moderate intensity</td>
                         </tr>
                         <tr className="bg-gray-50/50">
                           <td className="py-2.5 px-4 font-medium text-gray-900">HVAC Efficiency</td>
                           <td className="py-2.5 px-4 text-gray-700">92%</td>
                           <td className="py-2.5 px-4 text-gray-700">High efficiency</td>
                         </tr>
                         <tr>
                           <td className="py-2.5 px-4 font-medium text-gray-900">Sustainability Status</td>
                           <td className="py-2.5 px-4 text-gray-700">Optimal</td>
                           <td className="py-2.5 px-4 text-gray-700">No risk flags</td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                 </section>

                 {/* Section 4 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-1">4. Environmental Insights</h2>
                   
                   <div className="space-y-4">
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-1">4.1 Performance Overview</h3>
                       <p>The building demonstrates a well-balanced energy-to-emissions profile, indicating efficient system integration and no major inefficiencies in HVAC or base-load systems.</p>
                     </div>
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-1">4.2 Emissions Drivers</h3>
                       <p className="mb-1">Primary emissions are likely driven by:</p>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>HVAC operation (cooling load)</li>
                         <li>Lighting and plug loads</li>
                         <li>Baseline electrical consumption</li>
                       </ul>
                     </div>
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-1">4.3 Benchmark Interpretation</h3>
                       <p className="mb-1">Compared to typical commercial ESG reporting structures:</p>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Energy performance is stable</li>
                         <li>Emissions are proportional (no abnormal carbon leakage)</li>
                         <li>Efficiency indicators are above average due to HVAC performance</li>
                       </ul>
                     </div>
                   </div>
                 </section>

                 {/* Section 5 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-1">5. Risk & Opportunity Assessment</h2>
                   
                   <div className="space-y-4">
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-1">5.1 Environmental Risks</h3>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Moderate dependence on grid electricity</li>
                         <li>Carbon footprint tied directly to energy consumption patterns</li>
                       </ul>
                     </div>
                     <div>
                       <h3 className="text-base font-bold text-gray-900 mb-1">5.2 Improvement Opportunities</h3>
                       <ul className="list-disc pl-6 space-y-1">
                         <li>Increase renewable energy sourcing (solar integration or green tariffs)</li>
                         <li>Further optimization of HVAC scheduling and occupancy-based controls</li>
                         <li>Implementation of real-time energy monitoring dashboards</li>
                       </ul>
                     </div>
                   </div>
                 </section>

                 {/* Section 6 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">6. Governance (G)</h2>
                   <p className="mb-2">Although governance data was not provided, standard ESG building frameworks typically require:</p>
                   <ul className="list-disc pl-6 mb-3 space-y-1">
                     <li>Energy data transparency and audit trails</li>
                     <li>Automated reporting integrity controls</li>
                     <li>Verified operational datasets</li>
                   </ul>
                   <p>This report assumes structured data logging and consistent measurement methodology.</p>
                 </section>

                 {/* Section 7 */}
                 <section>
                   <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">7. Conclusion</h2>
                   <p className="mb-2">The building demonstrates strong ESG performance for the reporting period, with:</p>
                   <ul className="list-disc pl-6 mb-3 space-y-1">
                     <li>Efficient HVAC operation (92%)</li>
                     <li>Controlled carbon emissions aligned with energy use</li>
                     <li>Stable and optimal sustainability classification</li>
                   </ul>
                   <p>From an ESG compliance perspective, the building is currently operating within acceptable sustainability thresholds, with clear opportunities to further improve through renewable energy integration and smart energy optimization strategies.</p>
                 </section>

               </div>
               
               {/* End of Document Footer */}
               <div className="mt-16 pt-6 border-t border-gray-300 text-center text-sm text-gray-400 font-sans tracking-widest uppercase">
                 --- End of Report ---
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}