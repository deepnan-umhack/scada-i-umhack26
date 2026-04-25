import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  FileText, Calendar, Download, Plus, X, CheckCircle2, ChevronRight, ChevronLeft, Search 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Document, Page, pdfjs } from 'react-pdf';

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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  
  const [dbReports, setDbReports] = useState<ESGReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedReport, setSelectedReport] = useState<ESGReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- react-pdf State ---
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // --- Fetch ESG Reports from Supabase ---
  useEffect(() => {
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

    fetchReports();
  }, []);



  const handleGenerateReport = () => {
    setIsModalOpen(true);
  };

  const submitGenerateReport = async () => {
    setIsModalOpen(false);
    setGenerationState('generating');

    try {
      const response = await fetch("https://scada-i-umhack26.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate ESG Report from ${specifyStartTime ? formatDateTime(startDate, startHour, startMinute, startAmpm) : formatDateTime(startDate, '12', '00', 'AM')} to ${specifyEndTime ? formatDateTime(endDate, endHour, endMinute, endAmpm) : formatDateTime(endDate, '11', '59', 'PM')}`,
          thread_id: "render_test_01",
          user_id: "admin_001"
        })
      });
      
      const data = await response.json();
      console.log("Report Generation Output:", data);
      
      setGenerationState('success');
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
    setPageNumber(1); // Reset to page 1 on new document open
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
                {generationState === 'success' ? 'Report Generated Successfully' : 'Generating ESG Report...'}
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
          
          {/* Actions: Button + Search Bar */}
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
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {!isLoading && filteredReports.length > 0 ? (
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
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">ESG Building Performance Report</h4>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-xs font-mono font-medium text-gray-500">
                          {report.id}
                        </span>
                        <span className="hidden sm:inline text-gray-300 text-[10px]">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> {formatDate(report.created_at)}
                        </span>
                        <span className="hidden sm:inline text-gray-300 text-[10px]">•</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-2 sm:pt-0 pl-12 sm:pl-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">HVAC Rating</span>
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
          ) : !isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-center mt-10">
              <FileText className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No reports found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? `We couldn't find any reports matching "${searchQuery}"` : "The archive is currently empty."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* View Report react-pdf Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          
          {/* Top Toolbar */}
          <div className="w-full flex justify-between items-center px-4 py-3 md:px-6 absolute top-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500/20 text-blue-400">
                <FileText size={18} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-xl">
                  ESG Building Performance Report.pdf
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    {selectedReport.id}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <a 
                href={selectedReport.report_pdf_url} 
                target="_blank" 
                rel="noreferrer"
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors hidden sm:block" 
                title="Download / View External PDF"
              >
                <Download size={18} />
              </a>
              <div className="w-px h-5 bg-gray-600 hidden sm:block"></div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Centered react-pdf Viewer Area */}
          <div 
            className="flex-1 w-full h-full pt-24 pb-24 flex justify-center items-start relative z-0 overflow-y-auto [&::-webkit-scrollbar]:hidden"
            onClick={(e) => {
              // Close if clicking the transparent background
              if (e.target === e.currentTarget) setSelectedReport(null);
            }}
          >
             <Document
                file={selectedReport.report_pdf_url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center text-white/70 h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70 mb-4"></div>
                  </div>
                }
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

          {/* Subtle Professional Pagination Controls */}
          {numPages && numPages > 0 && (
            <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-[#1a1a1a]/85 backdrop-blur-md text-gray-300 px-1.5 py-1 rounded-full shadow-xl z-20 border border-white/10 flex items-center gap-3 transition-all select-none">
              <button 
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-[10px] font-semibold tracking-[0.2em] opacity-80 min-w-[3rem] text-center">
                {pageNumber} / {numPages}
              </span>
              
              <button 
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

        </div>
      )}

      {/* Generation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Generate New Report</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Start Period</label>
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col gap-2">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[140px] px-2.5 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-gray-800"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={specifyStartTime} onChange={(e) => setSpecifyStartTime(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
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
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px] px-2.5 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-gray-800"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={specifyEndTime} onChange={(e) => setSpecifyEndTime(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
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
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitGenerateReport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}