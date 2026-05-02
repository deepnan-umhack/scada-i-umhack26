import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Calendar, Download, Plus, X, CheckCircle2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Search, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Document, Page, pdfjs } from 'react-pdf';
import pdfIcon from "../assets/pdf_icon.png";
import testPicture from "../assets/test_picture.jpeg";
import instructPicture1 from "../assets/instruction_1.jpeg";
import instructPicture3 from "../assets/instruction_3.jpeg";

// --- Set up the pdfjs worker ---
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Initialize Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
type ESGReport = {
  id: string;
  period_start: string;
  period_end: string;
  generated_by: string;
  total_energy_kwh: number | string;
  carbon_footprint_kg: number | string;
  hvac_efficiency_rating: number;
  sustainability_status: string;
  created_at: string;
  report_pdf_url: string;
};

// --- Scroll Wheel Picker Component ---
const ScrollWheelPicker = ({ values, selected, onChange, label }: { values: string[]; selected: string; onChange: (v: string) => void; label: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 36;
  const isUserScroll = useRef(true);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToValue = useCallback((val: string, smooth = false) => {
    const idx = values.indexOf(val);
    if (idx >= 0 && containerRef.current) {
      isUserScroll.current = false;
      containerRef.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(() => { isUserScroll.current = true; }, 100);
    }
  }, [values]);

  useEffect(() => {
    scrollToValue(selected);
  }, [selected, scrollToValue]);

  const handleScroll = () => {
    if (!isUserScroll.current) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      if (!containerRef.current) return;
      const idx = Math.round(containerRef.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, values.length - 1));
      if (values[clamped] !== selected) {
        onChange(values[clamped]);
      }
    }, 80);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">{label}</span>
      <div className="relative h-[108px] w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <div className="absolute inset-x-0 top-0 h-[36px] bg-gradient-to-b from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[36px] bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-1 top-[36px] h-[36px] border border-indigo-200 bg-indigo-50/50 rounded-md z-[5] pointer-events-none" />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          <div style={{ height: ITEM_H }} />
          {values.map((v) => (
            <div
              key={v}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className={`flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer ${
                v === selected ? 'text-indigo-700' : 'text-gray-400'
              }`}
              onClick={() => { onChange(v); scrollToValue(v, true); }}
            >
              {v}
            </div>
          ))}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>
    </div>
  );
};

export default function EsgReports() {
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success'>('idle');
  const [generationStatusText, setGenerationStatusText] = useState("Initializing generation..."); // Added state for dynamic text
  
  // Modals state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const [startDate, setStartDate] = useState("2026-01-01");
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startAmpm, setStartAmpm] = useState("AM");
  const [specifyStartTime, setSpecifyStartTime] = useState(false);
  
  const [endDate, setEndDate] = useState("2026-01-01");
  const [endHour, setEndHour] = useState("11");
  const [endMinute, setEndMinute] = useState("59");
  const [endAmpm, setEndAmpm] = useState("PM");
  const [specifyEndTime, setSpecifyEndTime] = useState(false);

  const hours12 = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteVals = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));
  const ampmVals = ['AM', 'PM'];

  const formatDateTime = (date: string, hour: string, minute: string, ampm: string) => {
    const [y, m, d] = date.split('-');
    let h24 = parseInt(hour);
    if (ampm === 'AM' && h24 === 12) h24 = 0;
    else if (ampm === 'PM' && h24 !== 12) h24 += 12;
    return `${parseInt(m)}/${parseInt(d)}/${y} ${String(h24).padStart(2,'0')}:${minute}`;
  };

  // --- Calculate Duration ---
  const calculatedDuration = useMemo(() => {
    try {
      const startStr = formatDateTime(
        startDate, 
        specifyStartTime ? startHour : '12', 
        specifyStartTime ? startMinute : '00', 
        specifyStartTime ? startAmpm : 'AM'
      );
      const endStr = formatDateTime(
        endDate, 
        specifyEndTime ? endHour : '11', 
        specifyEndTime ? endMinute : '59', 
        specifyEndTime ? endAmpm : 'PM'
      );
      
      const startDt = new Date(startStr);
      const endDt = new Date(endStr);
      
      const diffMs = endDt.getTime() - startDt.getTime();
      
      if (isNaN(diffMs) || diffMs < 0) {
        return "Invalid period";
      }
      
      const diffHours = diffMs / (1000 * 60 * 60);
      const days = Math.floor(diffHours / 24);
      const hours = Math.floor(diffHours % 24);
      
      if (days === 0 && hours === 0) return "< 1 hour";
      
      const dayParts = [];
      if (days > 0) dayParts.push(`${days} day${days > 1 ? 's' : ''}`);
      if (hours > 0) dayParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      
      return dayParts.join(', ');
    } catch (e) {
      return "Calculating...";
    }
  }, [startDate, startHour, startMinute, startAmpm, specifyStartTime, endDate, endHour, endMinute, endAmpm, specifyEndTime]);

  
  const [dbReports, setDbReports] = useState<ESGReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedReport, setSelectedReport] = useState<ESGReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- react-pdf State ---
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // --- Fetch ESG Reports from Supabase ---
  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('esg_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      if (data) {
        setDbReports(data);
      }
    } catch (err) {
      console.error("Failed to fetch ESG reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = () => {
    setIsGuideOpen(true);
  };

  const submitGenerateReport = async () => {
    if (calculatedDuration === "Invalid period") return;

    setIsGenerateOpen(false);
    setGenerationState('generating');
    setGenerationStatusText('Initializing generation...');

    try {
      const response = await fetch("https://scada-i-umhack26-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate ESG Report from ${specifyStartTime ? formatDateTime(startDate, startHour, startMinute, startAmpm) : formatDateTime(startDate, '12', '00', 'AM')} to ${specifyEndTime ? formatDateTime(endDate, endHour, endMinute, endAmpm) : formatDateTime(endDate, '11', '59', 'PM')}`,
          thread_id: "render_test_01",
          user_id: "admin_001"
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process each line as it arrives
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'thought' || data.type === 'action') {
                // Update the state with the current agent and their action
                setGenerationStatusText(`${data.agent}: ${data.action}...`);
              } else if (data.type === 'done') {
                setGenerationState('success');
                await fetchReports(); // Auto-refresh reports on completion
              }
            } catch (err) {
              console.error("Error parsing stream chunk:", err, line);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to trigger report generation:", err);
      setGenerationState('idle');
    }
  };

  const filteredReports = dbReports.filter((report) => 
    report.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper formatting functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // react-pdf load handler
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1); 
  };

  return (
    <div className="w-full pb-6 lg:pb-0 font-sans text-gray-900 bg-transparent min-h-full flex flex-col gap-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm font-medium text-gray-500 mb-2">
            <Link to="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
            <span className="text-gray-400 px-1">•</span>
            <span className="text-indigo-600">ESG Reports</span>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">SCADA-i Generative Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor real-time environment & energy metrics</p>
        </div>
      </div>

      {generationState !== 'idle' && (
        <div className={`border rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2 shadow-sm ${generationState === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200'}`}>
          <div className="flex items-center gap-4">
            <div className="flex justify-center items-center h-8 w-8 shrink-0">
              {generationState === 'generating' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${generationState === 'success' ? 'text-emerald-900' : 'text-indigo-900'}`}>
                {generationState === 'success' ? 'Report Generated Successfully' : generationStatusText}
              </h3>
              <p className={`text-xs mt-0.5 ${generationState === 'success' ? 'text-emerald-700/80' : 'text-indigo-700/80'}`}>
                {generationState === 'success' 
                  ? 'Your report has been successfully processed.' 
                  : 'This will take awhile. Feel free to preview your other reports while waiting.'}
              </p>
            </div>
          </div>
          {generationState === 'success' && (
            <button onClick={() => setGenerationState('idle')} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors" title="Dismiss">
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Main Content: Report Archive List */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden relative">
        <div className="p-4 lg:px-6 lg:py-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center bg-gray-50/50 gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Report Archive</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleGenerateReport}
              disabled={generationState === 'generating'}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all shadow-sm shrink-0 ${generationState === 'generating' ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 text-white active:scale-95'}`}
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
        
        <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full relative">
          
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 lg:px-6 bg-white animate-pulse">
                  <div className="flex items-center gap-4 mb-2 sm:mb-0">
                    <div className="w-7 h-7 bg-gray-200 rounded-md shrink-0"></div>
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 bg-gray-200 rounded w-48 sm:w-64"></div>
                      <div className="h-3 bg-gray-100 rounded w-32 sm:w-40 mt-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-2 sm:pt-0 pl-12 sm:pl-0">
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <div className="h-2.5 bg-gray-200 rounded w-10"></div>
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredReports.map((report, index) => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 lg:px-6 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-4 mb-2 sm:mb-0">
                    <div className="p-1 bg-gray-100 flex items-center justify-center rounded-md">
                      <img src={pdfIcon} alt="PDF Icon" className="w-5 h-5 object-contain" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 no-underline group-hover:underline transition-colors">ESG Building Performance Report #{filteredReports.length - index}</h4>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-xs font-mono font-medium text-gray-500">{report.id}</span>
                        <span className="hidden sm:inline text-gray-300 text-[10px]">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> {formatDate(report.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-2 sm:pt-0 pl-12 sm:pl-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Rating</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-gray-900">{report.hvac_efficiency_rating}</span>
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
            <div className="flex flex-col items-center justify-center h-48 text-center mt-10">
              <img src={pdfIcon} alt="No Reports" className="w-8 h-8 object-contain mb-3 opacity-50 grayscale" />
              <p className="text-sm font-medium text-gray-900">No reports found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? `We couldn't find any reports matching "${searchQuery}"` : "The archive is currently empty."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- View Report Modal --- */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          
          {/* Top Toolbar */}
          <div className="w-full flex justify-between items-center px-4 py-3 md:px-6 absolute top-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500/20">
                <img src={pdfIcon} alt="PDF Icon" className="w-[18px] h-[18px] object-contain" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-xl">ESG Building Performance Report.pdf</h2>
                <span className="text-xs font-mono text-gray-400">{selectedReport.id}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <a href={selectedReport.report_pdf_url} target="_blank" rel="noreferrer" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors hidden sm:block">
                <Download size={18} />
              </a>
              <div className="w-px h-5 bg-gray-600 hidden sm:block"></div>
              <button onClick={() => setSelectedReport(null)} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF Viewer Area */}
          <div 
            className="flex-1 w-full h-full pt-24 pb-24 flex justify-center items-start relative z-0 overflow-y-auto [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.target === e.currentTarget && setSelectedReport(null)}
          >
             <Document
                file={selectedReport.report_pdf_url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="flex flex-col items-center justify-center text-white/70 h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70 mb-4"></div></div>}
                className="flex justify-center"
             >
                <Page 
                  pageNumber={pageNumber} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false}
                  className="shadow-2xl rounded-sm overflow-hidden pointer-events-none max-w-[95vw]"
                  width={Math.min(window.innerWidth * 0.95, 850)} 
                />
             </Document>
          </div>

          {/* --- VERTICAL PAGE NUMBERING PILL ON THE RIGHT --- */}
          {numPages && numPages > 0 && (
            <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-[#1a1a1a]/85 backdrop-blur-md text-gray-300 w-12 py-3 rounded-full shadow-xl z-20 border border-white/10 flex flex-col items-center gap-4 transition-all select-none">
              <button 
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronUp size={18} />
              </button>
              
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-bold text-white leading-none">
                  {pageNumber}
                </span>
                <div className="w-4 h-[1px] bg-white/20 my-1" />
                <span className="text-[10px] font-semibold opacity-50 leading-none">
                  {numPages}
                </span>
              </div>
              
              <button 
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Guide Modal (3 Steps) --- */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">How to Generate a Report</h3>
              <button onClick={() => setIsGuideOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Step 1 */}
                <div className="flex flex-col gap-3 text-center items-center">
                  <img src={instructPicture1} alt="Step 1" className="w-full h-32 md:h-40 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  <h4 className="font-semibold text-gray-900 text-sm">1. Select Period</h4>
                  <p className="text-xs text-gray-500 px-2">Choose the specific start and end dates and times for the data you wish to compile.</p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col gap-3 text-center items-center">
                  <img src={testPicture} alt="Step 2" className="w-full h-32 md:h-40 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  <h4 className="font-semibold text-gray-900 text-sm">2. AI Generation</h4>
                  <p className="text-xs text-gray-500 px-2">The system will process the facility data and compile an AI-driven sustainability assessment.</p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col gap-3 text-center items-center">
                  <img src={instructPicture3} alt="Step 3" className="w-full h-32 md:h-40 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  <h4 className="font-semibold text-gray-900 text-sm">3. View & Export</h4>
                  <p className="text-xs text-gray-500 px-2">Once complete, preview the document natively in the browser or export it as a PDF.</p>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={() => setIsGuideOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  setIsGuideOpen(false);
                  setIsGenerateOpen(true);
                }} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm flex items-center gap-1.5"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal (Form) */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Generate New Report</h3>
              <button onClick={() => setIsGenerateOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Start Period</label>
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col gap-2">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[140px] px-2.5 py-2 border border-gray-300 rounded-md shadow-sm text-xs" />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={specifyStartTime} onChange={(e) => setSpecifyStartTime(e.target.checked)} className="w-3.5 h-3.5 rounded text-indigo-600" />
                      <span className="text-[11px] text-gray-500 font-medium">Specify time</span>
                    </label>
                  </div>
                  <div className={`flex items-end gap-1.5 flex-1 justify-center transition-opacity ${specifyStartTime ? '' : 'opacity-30 pointer-events-none'}`}>
                    <ScrollWheelPicker values={hours12} selected={startHour} onChange={setStartHour} label="" />
                    <span className="text-lg font-bold text-gray-300 pb-10">:</span>
                    <ScrollWheelPicker values={minuteVals} selected={startMinute} onChange={setStartMinute} label="" />
                    <ScrollWheelPicker values={ampmVals} selected={startAmpm} onChange={setStartAmpm} label="" />
                  </div>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">End Period</label>
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col gap-2">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[140px] px-2.5 py-2 border border-gray-300 rounded-md shadow-sm text-xs" />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={specifyEndTime} onChange={(e) => setSpecifyEndTime(e.target.checked)} className="w-3.5 h-3.5 rounded text-indigo-600" />
                      <span className="text-[11px] text-gray-500 font-medium">Specify time</span>
                    </label>
                  </div>
                  <div className={`flex items-end gap-1.5 flex-1 justify-center transition-opacity ${specifyEndTime ? '' : 'opacity-30 pointer-events-none'}`}>
                    <ScrollWheelPicker values={hours12} selected={endHour} onChange={setEndHour} label="" />
                    <span className="text-lg font-bold text-gray-300 pb-10">:</span>
                    <ScrollWheelPicker values={minuteVals} selected={endMinute} onChange={setEndMinute} label="" />
                    <ScrollWheelPicker values={ampmVals} selected={endAmpm} onChange={setEndAmpm} label="" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with subtle duration indicator */}
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-medium">Reporting:</span>
                <span className={`font-medium ${calculatedDuration === 'Invalid period' ? 'text-red-500' : 'text-gray-900'}`}>
                  {calculatedDuration}
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsGenerateOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Cancel</button>
                <button 
                  onClick={submitGenerateReport} 
                  disabled={calculatedDuration === "Invalid period"}
                  className={`px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-all ${
                    calculatedDuration === "Invalid period" 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Generate
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}