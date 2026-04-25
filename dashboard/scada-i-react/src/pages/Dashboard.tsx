import { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, ReferenceLine, Legend
} from "recharts";
import { 
  Cloud, Zap, Users, Leaf, Lightbulb, Settings2, User, Bot, Thermometer, Droplets, X, Wind, Minus, Plus, ChevronDown, ChevronLeft, ChevronRight, Calendar, MapPin, Package, FileText 
} from "lucide-react";
import { Link } from "react-router-dom";

// --- Initialize Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
type LogEntry = {
  id: number;
  time: string;
  type: 'IN' | 'OUT';
  topic: string;
  payload: string;
};

// --- Custom Weather SVG Component ---
const WeatherSVG = ({ condition, className }: { condition: string, className?: string }) => {
  switch (condition.toLowerCase()) {
    case "rain":
    case "rainy":
    case "storm":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 28C20 21.3726 25.3726 16 32 16C37.5326 16 42.1848 19.7423 43.646 24.8453C48.824 25.5181 53 29.9734 53 35.5C53 41.299 48.299 46 42.5 46H19C12.9249 46 8 41.0751 8 35C8 29.3204 12.309 24.6453 17.834 24.046C18.455 25.238 19.177 26.577 20 28Z" fill="#6B7280" />
          <path d="M24 50L20 58M34 50L30 58M44 50L40 58" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "cloudy":
    case "overcast":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M44 26C44 19.3726 38.6274 14 32 14C26.4674 14 21.8152 17.7423 20.354 22.8453C15.176 23.5181 11 27.9734 11 33.5C11 39.299 15.701 44 21.5 44H45C51.0751 44 56 39.0751 56 33C56 27.3204 51.691 22.6453 46.166 22.046C45.545 23.238 44.823 24.577 44 26Z" fill="#9CA3AF" />
          <path d="M20 32C20 25.3726 25.3726 20 32 20C37.5326 20 42.1848 23.7423 43.646 28.8453C48.824 29.5181 53 33.9734 53 39.5C53 45.299 48.299 50 42.5 50H19C12.9249 50 8 45.0751 8 39C8 33.3204 12.309 28.6453 17.834 28.046C18.455 29.238 19.177 30.577 20 32Z" fill="#E5E7EB" />
        </svg>
      );
    case "snow":
    case "snowy":
    case "cold":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 28C20 21.3726 25.3726 16 32 16C37.5326 16 42.1848 19.7423 43.646 24.8453C48.824 25.5181 53 29.9734 53 35.5C53 41.299 48.299 46 42.5 46H19C12.9249 46 8 41.0751 8 35C8 29.3204 12.309 24.6453 17.834 24.046C18.455 25.238 19.177 26.577 20 28Z" fill="#93C5FD" />
          <path d="M24 49L24 57M20 53L28 53M21 50L27 56M27 50L21 56" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M34 53L34 61M30 57L38 57M31 54L37 60M37 54L31 60" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M44 47L44 55M40 51L48 51M41 48L47 54M47 48L41 54" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "sunny":
    case "clear":
    default:
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="14" fill="#FBBF24" />
          <path d="M32 6V12M32 52V58M13.6 13.6L17.8 17.8M46.2 46.2L50.4 50.4M6 32H12M52 32H58M13.6 50.4L17.8 46.2M46.2 17.8L50.4 13.6" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
  }
};

// --- Initial Mock Data for Charts ---
const initialPowerData: any[] = [];
const initialClimateData: any[] = [];
const initialOccupancyGrid = Array(6).fill(false);

// --- Custom Scrollbar Styles for the Console ---
const consoleScrollbar = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-gray-900 hover:[&::-webkit-scrollbar-thumb]:bg-gray-600";

// --- Custom Animated Number ---
const AnimatedNumber = ({ value, decimals = 1, duration = 800 }: { value: number | null, decimals?: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const currentValRef = useRef<number | null>(value);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      currentValRef.current = null;
      return;
    }

    if (currentValRef.current === null) {
      setDisplayValue(value);
      currentValRef.current = value;
      return;
    }

    const startValue = currentValRef.current;
    const endValue = value;
    
    if (startValue === endValue) return;

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Cubic ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = startValue + (endValue - startValue) * easeProgress;
      currentValRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [value, duration]);

  if (displayValue === null) return null;
  return <span>{displayValue.toFixed(decimals)}</span>;
};

export default function Dashboard() {
  // --- STATE ---
  const [devices, setDevices] = useState<{
    mode: 'auto' | 'manual';
    ac: boolean;
    lights: boolean;
    targetTemperature: number;
    fanSpeed: number;
    controlReason?: string;
  }>({
    mode: 'auto',
    ac: false,
    lights: false,
    targetTemperature: 21.5,
    fanSpeed: 3,
  });

  const [pendingAction, setPendingAction] = useState<{key: keyof typeof devices, val?: number} | null>(null);

  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  
  const [powerWatts, setPowerWatts] = useState<number | null>(null);
  const [dailyEnergy, setDailyEnergy] = useState(0);
  const [dailySavings, setDailySavings] = useState(0); 
  const lastEnergyUpdateRef = useRef<number | null>(null);
  const currentDayRef = useRef<number | null>(null);
  
  const [grid, setGrid] = useState<boolean[]>(initialOccupancyGrid);

  // States for Header Art & Outside Data
  const [weatherCondition, setWeatherCondition] = useState("N/A");
  const [outsideTemp, setOutsideTemp] = useState<number | null>(null);
  const [outsideHumidity, setOutsideHumidity] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState("Awaiting data...");

  const [powerChartData, setPowerChartData] = useState(initialPowerData);
  const [climateChartData, setClimateChartData] = useState(initialClimateData);
  
  // --- System Log State ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [aiLogs, setAiLogs] = useState<LogEntry[]>([]);
  const [activeLogTab, setActiveLogTab] = useState<'system' | 'ai'>('system');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const logIdRef = useRef(0);
  
  // --- Filter State for Topics ---
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [hiddenTopics, setHiddenTopics] = useState<string[]>([]);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  // --- Booking Status State ---
  const [dbBookings, setDbBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [expandedBookingStatus, setExpandedBookingStatus] = useState<string | null>(null);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target as Node)) {
        setIsTopicDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  // Helper function to add a message to the log
  const addLog = (type: 'IN' | 'OUT', topic: string, payloadObj: any) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const newLog: LogEntry = {
      id: logIdRef.current++,
      time,
      type,
      topic,
      payload: JSON.stringify(payloadObj)
    };
    
    if (topic === "scada-i-demo/ai") {
      setAiLogs(prev => [newLog, ...prev].slice(0, 50));
    } else {
      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }
  };

  const renderPayload = (payloadStr: string) => {
    try {
      const obj = JSON.parse(payloadStr);
      if (typeof obj !== 'object' || obj === null) return <span className="text-white">{payloadStr}</span>;
      
      return Object.entries(obj).map(([key, value], index) => {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return (
          <div key={index}>
            <span className="text-emerald-400">{key}: </span>
            <span className="text-white">{valStr}</span>
          </div>
        );
      });
    } catch {
      return <span className="text-white">{payloadStr}</span>; 
    }
  };

  // --- Supabase Bookings Fetch ---
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoadingBookings(true);
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            rooms ( name )
          `)
          .order('start_time', { ascending: true });

        if (error) throw error;

        if (data) {
          const formatted = data.map((b: any) => {
            const startDate = new Date(b.start_time);
            const endDate = new Date(b.end_time);
            const createdDate = new Date(b.created_at || new Date());

            const dateStr = `${startDate.toLocaleDateString('en-GB')} (${startDate.toLocaleDateString('en-GB', { weekday: 'long' })})`;
            const timeStr = `${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()} - ${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;
            const promptTimestamp = `${createdDate.toLocaleDateString('en-GB')}, ${createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toLowerCase()}`;

            return {
              status: { label: (b.status || 'PENDING').toUpperCase(), determined_by: "system" },
              event: { 
                name: b.purpose || "Untitled Booking", 
                date: dateStr, 
                time: timeStr, 
                room: b.rooms?.name || "Unknown Room", 
                equipment: "N/A", 
                department: "N/A" 
              },
              user_prompt: { 
                timestamp: promptTimestamp, 
                message: b.source_prompt || "No prompt provided" 
              }
            };
          });
          setDbBookings(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchBookings();
  }, []);

  // --- MQTT Subscription ---
  useEffect(() => {
    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt");
    clientRef.current = client;

    client.on("connect", () => {
      console.log("🟢 Connected to public MQTT broker!");
      client.subscribe("scada-i-demo/sensors");
      client.subscribe("scada-i-demo/status");
      client.subscribe("scada-i-demo/ai");
      addLog('IN', 'system', { status: 'Connected to broker.emqx.io' });
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        addLog('IN', topic, data);
        
        if (topic === "scada-i-demo/status") {
          setDevices(prev => {
            const newState = { ...prev };
            let hasChanges = false;
            
            if (data.mode !== undefined && data.mode !== prev.mode) {
              newState.mode = data.mode;
              hasChanges = true;
            }
            if (data.ac !== undefined && data.ac !== prev.ac) {
              newState.ac = data.ac;
              hasChanges = true;
            }
            if (data.lights !== undefined && data.lights !== prev.lights) {
              newState.lights = data.lights;
              hasChanges = true;
            }
            const incomingTemp = data.acTempSetting !== undefined ? data.acTempSetting : data.targetTemperature;
            if (incomingTemp !== undefined && incomingTemp !== prev.targetTemperature) {
              newState.targetTemperature = incomingTemp;
              hasChanges = true;
            }
            if (data.fanSpeed !== undefined && data.fanSpeed !== prev.fanSpeed) {
              newState.fanSpeed = data.fanSpeed;
              hasChanges = true;
            }
            
            return hasChanges ? newState : prev;
          });
        } else if (topic === "scada-i-demo/sensors") {
          
          let chartTime = new Date().toLocaleTimeString([], { hour12: false });
          
          if (data.timestamp !== undefined) {
            setLastUpdated(data.timestamp);
            const timeParts = data.timestamp.split(' ');
            chartTime = timeParts.length > 1 ? timeParts[1] : data.timestamp;
          }
          if (data.weather_condition !== undefined) {
            setWeatherCondition(data.weather_condition);
          }
          if (data.outside_temp !== undefined) {
            setOutsideTemp(Number(data.outside_temp.toFixed(1)));
          }
          if (data.outside_humidity !== undefined) {
            setOutsideHumidity(Number(data.outside_humidity.toFixed(1)));
          }
          
          if (data.room_temp !== undefined || data.temperature !== undefined || data.humidity !== undefined) {
            const incomingTemp = data.room_temp !== undefined ? data.room_temp : data.temperature;
            const tempVal = incomingTemp !== undefined ? Number(incomingTemp.toFixed(1)) : temperature;
            const humVal = data.humidity !== undefined ? Number(data.humidity.toFixed(1)) : humidity;
            
            if (incomingTemp !== undefined) setTemperature(tempVal);
            if (data.humidity !== undefined) setHumidity(humVal);

            setClimateChartData(prev => {
              const newData = [...prev, { time: chartTime, temp: tempVal, humidity: humVal }];
              if (newData.length > 8) newData.shift();
              return newData;
            });
          }
          
          const totalPower = data.power_kw !== undefined ? data.power_kw : (data.power_usage !== undefined ? data.power_usage :
            (data.ac_power_usage !== undefined && data.light_power_usage !== undefined
              ? data.ac_power_usage + data.light_power_usage
              : undefined));

          if (totalPower !== undefined && data.timestamp !== undefined) {
            const powerVal = Number(totalPower.toFixed(2));
            setPowerWatts(powerVal);
            
            // Parse simulated time and day from payload
            const currentSimTime = new Date(data.timestamp).getTime();
            const incomingDayOfYear = data.day_of_year !== undefined ? data.day_of_year : new Date(data.timestamp).getDate();
            
            // Check if we hit a new day
            let isNewDay = false;
            if (currentDayRef.current !== null && currentDayRef.current !== incomingDayOfYear) {
              isNewDay = true;
            }
            currentDayRef.current = incomingDayOfYear;
            
            if (lastEnergyUpdateRef.current === null) {
              lastEnergyUpdateRef.current = currentSimTime;
            } else {
              const hoursPassed = (currentSimTime - lastEnergyUpdateRef.current) / (1000 * 60 * 60);
              
              // --- REALISTIC DYNAMIC BASELINE ---
              const hour = data.hour_of_day !== undefined ? data.hour_of_day : new Date(data.timestamp).getHours();
              const occupants = data.occupancy_count !== undefined ? data.occupancy_count : (data.occupancy !== undefined ? data.occupancy : 0);
              
              // Max hardware capacity based on your payload examples
              const MAX_AC_KW = 1.7;
              const MAX_LIGHTS_KW = 0.2;
              const MAX_TOTAL_KW = MAX_AC_KW + MAX_LIGHTS_KW; // 1.9 kW
              
              let expectedPower = 0;
              
              if (hour >= 8 && hour <= 18) {
                // A typical "dumb" room leaves everything running during working hours
                expectedPower = MAX_TOTAL_KW;
              } else {
                // Off-hours: people usually turn off AC, but might forget lights
                // If there's an occupant late at night, they turn everything on
                expectedPower = occupants > 0 ? MAX_TOTAL_KW : MAX_LIGHTS_KW; 
              }
              
              const calculatedSavings = Number(Math.max(expectedPower - powerVal, 0).toFixed(2));
              
              if (hoursPassed > 0) {
                if (isNewDay) {
                  // Reset logic for a new day
                  setDailyEnergy(0);
                  setDailySavings(0);
                } else {
                  // Normal accumulation
                  setDailyEnergy(prev => prev + (powerVal * hoursPassed));
                  setDailySavings(prev => prev + (calculatedSavings * hoursPassed));
                }
                lastEnergyUpdateRef.current = currentSimTime;
              }
              
              setPowerChartData(prev => {
                const newData = [...prev, { time: chartTime, consumption: powerVal, savings: calculatedSavings }];
                if (newData.length > 8) newData.shift();
                return newData;
              });
            }
          }
          
          if (data.seat_status !== undefined) {
            setGrid(data.seat_status.map((status: number) => status === 1).slice(0, 6));
          } else if (data.grid !== undefined) {
            setGrid(data.grid.slice(0, 6)); 
          } else if (data.occupancy_count !== undefined || data.occupancy !== undefined) {
            const count = data.occupancy_count !== undefined ? data.occupancy_count : data.occupancy;
            const newGrid = Array(6).fill(false);
            for(let i=0; i < Math.min(count, 6); i++) {
              newGrid[i] = true;
            }
            setGrid(newGrid);
          }

          if (data.fan_speed !== undefined || data.ac_temp_setting !== undefined || data.ac_control_reason !== undefined) {
            setDevices(prev => {
              const newState = { ...prev };
              let hasChanges = false;

              if (data.fan_speed !== undefined && data.fan_speed !== null) {
                 const fsMap: Record<string, number> = { "AUTO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3 };
                 if (typeof data.fan_speed === 'string') {
                   const fsUpper = data.fan_speed.toUpperCase();
                   if (fsUpper === "OFF") {
                      if (newState.ac !== false) { newState.ac = false; hasChanges = true; }
                   } else if (fsMap[fsUpper] !== undefined) {
                      if (newState.fanSpeed !== fsMap[fsUpper]) { newState.fanSpeed = fsMap[fsUpper]; hasChanges = true; }
                      if (newState.ac !== true) { newState.ac = true; hasChanges = true; }
                   }
                 }
              }

              if (data.ac_temp_setting !== undefined) {
                 if (data.ac_temp_setting === null || (typeof data.ac_temp_setting === 'string' && data.ac_temp_setting.toUpperCase() === "OFF")) {
                    if (newState.ac !== false) { newState.ac = false; hasChanges = true; }
                 } else {
                    const temp = parseFloat(data.ac_temp_setting);
                    if (!isNaN(temp) && newState.targetTemperature !== temp) {
                       newState.targetTemperature = temp;
                       hasChanges = true;
                    }
                    if (newState.ac !== true) { newState.ac = true; hasChanges = true; }
                 }
              }

              if (data.ac_control_reason !== undefined && data.ac_control_reason !== null) {
                 if (newState.controlReason !== data.ac_control_reason) {
                    newState.controlReason = data.ac_control_reason;
                    hasChanges = true;
                 }
              }

              return hasChanges ? newState : prev;
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse MQTT message", err);
      }
    });

    return () => {
      if (client) client.end();
    };
  }, [temperature, humidity]); 

  const executeToggle = (key: keyof typeof devices, val?: number) => {
    const newState = { ...devices };
    if (key === 'mode') {
      newState.mode = devices.mode === 'auto' ? 'manual' : 'auto';
    } else if (key === 'ac' || key === 'lights') {
      newState[key as 'ac' | 'lights'] = !devices[key as 'ac' | 'lights'];
    } else if (val !== undefined && (key === 'targetTemperature' || key === 'fanSpeed')) {
      newState[key as 'targetTemperature' | 'fanSpeed'] = val;
    }
    
    if (key !== 'mode' && devices.mode === 'auto') {
      newState.mode = 'manual';
    }
    
    if (clientRef.current) {
      clientRef.current.publish(
        "scada-i-demo/actions", 
        JSON.stringify(newState)
      );
      addLog('OUT', "scada-i-demo/actions", newState);
    }
    
    setDevices(newState);
  };

  const toggleDevice = (key: keyof typeof devices, val?: number) => {
    if (key !== 'mode' && devices.mode === 'auto') {
      setPendingAction({ key, val });
      return;
    }
    executeToggle(key, val);
  };

  const occupiedCount = grid.filter(Boolean).length;

  // Filter Active Logs based on selected visibility
  const displayedLogs = activeLogTab === 'system' ? logs : aiLogs;
  const filteredLogs = displayedLogs.filter(log => !hiddenTopics.includes(log.topic));
  
  // Get unique topics for the current tab
  const uniqueTopics = Array.from(new Set(displayedLogs.map(log => log.topic)));

  const toggleTopicVisibility = (topic: string) => {
    setHiddenTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  return (
    <div className="w-full pb-6 lg:pb-0 font-sans text-gray-900 bg-gray-50 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-4 px-4 pt-4 lg:px-0 lg:pt-0">
        <div>
          <nav className="flex items-center space-x-2 text-sm font-medium text-gray-500 mb-2">
            <span className="text-indigo-600">Dashboard</span>
            <span className="text-gray-400 px-1">•</span>
            <Link to="/dashboard/esg-reports" className="hover:text-gray-900 transition-colors">ESG Reports</Link>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">SCADA-i Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor real-time environment & energy metrics</p>
        </div>
        
        <div className="flex flex-col items-end text-right mt-2 lg:mt-0">
          <div className="flex items-center gap-3 lg:gap-4 mb-1">
            <div className="flex items-center gap-1.5 lg:gap-2">
              <WeatherSVG condition={weatherCondition} className="w-6 h-6 lg:w-7 lg:h-7 drop-shadow-sm" />
              <span className="text-sm lg:text-base font-bold text-gray-700 capitalize">
                {weatherCondition !== "N/A" ? weatherCondition : "Awaiting..."}
              </span>
            </div>
            <div className="h-5 w-px bg-gray-300 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 lg:gap-2 text-sm lg:text-base">
              <span className="text-gray-900">{outsideTemp !== null ? <><AnimatedNumber value={outsideTemp} decimals={1} /> °C</> : "N/A"}</span>
              <span className="text-gray-300 text-xs">•</span>
              <span className="text-sky-700">{outsideHumidity !== null ? <><AnimatedNumber value={outsideHumidity} decimals={1} />% RH</> : "N/A"}</span>
            </div>
          </div>
          <p className="text-[10px] lg:text-xs text-gray-500 font-medium">
            Last updated on: <span className="font-semibold text-gray-800">{lastUpdated}</span>
          </p>
        </div>
      </div>

      {/* Actionable Metrics Cards */}
      <div className="-mr-4 pr-4 sm:-mr-6 sm:pr-6 md:-mr-8 md:pr-8 lg:-mr-10 lg:pr-10 xl:mr-0 xl:pr-0 grid grid-rows-2 grid-flow-col auto-cols-[85%] sm:auto-cols-[45%] md:flex md:flex-row xl:grid xl:grid-rows-1 xl:grid-cols-4 gap-2 overflow-x-auto snap-x snap-mandatory pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] mb-2 px-4 lg:px-0">
        
        {/* Card 1: CLIMATE (Temp + Humidity) */}
        <div className="snap-center md:snap-start md:shrink-0 md:w-[280px] lg:w-[320px] xl:w-auto xl:shrink rounded-lg border border-blue-200/60 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
          <div className="bg-blue-100 px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-3 flex flex-row items-center justify-between border-b border-blue-200/40">
            <h3 className="text-xs lg:text-lg font-medium text-black tracking-tight">Room Climate</h3>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Thermometer className="w-4 h-4 lg:w-5 lg:h-5 text-blue-700" />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4 flex-1">
            <div className="text-2xl lg:text-3xl font-semibold text-gray-800 tracking-tight">
              {temperature !== null ? <AnimatedNumber value={temperature} decimals={1} /> : "N/A"} 
              {temperature !== null && <span className="text-sm font-medium text-gray-400 ml-1">°C</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 lg:mt-2">
              <span className="flex items-center text-[11px] lg:text-xs font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                <Droplets className="w-3 h-3 mr-1" /> {humidity !== null ? <><AnimatedNumber value={humidity} decimals={1} />% RH</> : "N/A"}
              </span>
              <span className={`text-[11px] lg:text-xs font-medium ${temperature !== null && temperature >= 26 ? "text-orange-500" : "text-emerald-500"}`}>
                {temperature === null ? "..." : (temperature >= 26 ? "Cooling required" : "Optimal")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Power */}
        <div className="snap-center md:snap-start md:shrink-0 md:w-[280px] lg:w-[320px] xl:w-auto xl:shrink rounded-lg border border-yellow-200/60 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
          <div className="bg-yellow-100 px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-3 flex flex-row items-center justify-between border-b border-yellow-200/40">
            <h3 className="text-xs lg:text-lg font-medium text-black tracking-tight">Energy Consumed Today</h3>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-700" />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4 flex-1">
            <div className="text-2xl lg:text-3xl font-semibold text-gray-800 tracking-tight">
              {powerWatts !== null ? <AnimatedNumber value={dailyEnergy} decimals={2} /> : "N/A"} 
              {powerWatts !== null && <span className="text-sm font-medium text-gray-400 ml-1">kWh</span>}
            </div>
            <p className="text-[11px] lg:text-xs text-gray-500 mt-1.5 lg:mt-2 font-medium">Accumulated today</p>
          </div>
        </div>

        {/* Card 3: Occupancy */}
        <div className="snap-center md:snap-start md:shrink-0 md:w-[280px] lg:w-[320px] xl:w-auto xl:shrink rounded-lg border border-pink-200/60 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
          <div className="bg-pink-100 px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-3 flex flex-row items-center justify-between border-b border-pink-200/40">
            <h3 className="text-xs lg:text-lg font-medium text-black tracking-tight">Current Occupancy</h3>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-pink-700" />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4 flex-1">
            <div className="text-2xl lg:text-3xl font-semibold text-gray-800 tracking-tight">{occupiedCount} <span className="text-lg text-gray-400 font-medium">/ 6</span></div>
            <p className="text-[11px] lg:text-xs text-gray-500 mt-1.5 lg:mt-2 font-medium">Seats in use</p>
          </div>
        </div>

        {/* Card 4: Energy Saved */}
        <div className="snap-center md:snap-start md:shrink-0 md:w-[280px] lg:w-[320px] xl:w-auto xl:shrink rounded-lg border border-green-200/60 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
          <div className="bg-green-100 px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-3 flex flex-row items-center justify-between border-b border-green-200/40">
            <h3 className="text-xs lg:text-lg font-medium text-black tracking-tight">Energy Saved Today</h3>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 lg:w-5 lg:h-5 text-green-700" />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4 flex-1">
            <div className="text-2xl lg:text-3xl font-semibold text-gray-800 tracking-tight">
              {powerWatts !== null ? <AnimatedNumber value={dailySavings} decimals={2} /> : "N/A"} 
              {powerWatts !== null && <span className="text-sm font-medium text-gray-400 ml-1">kWh</span>}
            </div>
            <p className="text-[11px] lg:text-xs text-gray-500 mt-1.5 lg:mt-2 font-medium">Compared to baseline</p>
          </div>
        </div>
      </div>

      {/* Top Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-3 items-stretch mt-2 lg:mt-1 px-4 lg:px-0">
        <div className="lg:col-span-2 rounded-lg border border-gray-200/60 bg-white shadow-sm p-4 lg:p-6 flex flex-col">
          <div className="mb-4 lg:mb-6">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 tracking-tight">Real-Time Power Analytics</h3>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">Consumption vs. AI savings over time (kW)</p>
          </div>
          <div className="flex-1 min-h-[250px] lg:min-h-[300px] w-full">
            {powerChartData.length === 0 ? (
              <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm italic">
                Data not available at the moment
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#b9b9b983" vertical={true} />
                  <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} tickMargin={10} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" name="Consumption" dataKey="consumption" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorConsumption)" isAnimationActive={false} />
                  <Area type="monotone" name="Savings" dataKey="savings" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 rounded-lg border border-gray-200/60 bg-white shadow-sm p-4 lg:p-6 flex flex-col">
          <div className="mb-4 lg:mb-6">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 tracking-tight">Real-Time Room Climate</h3>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">Temperature (°C) and Humidity (%)</p>
          </div>
          <div className="flex-1 min-h-[250px] lg:min-h-[300px] w-full">
            {climateChartData.length === 0 ? (
              <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm italic">
                Data not available at the moment
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={climateChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#b9b9b983" vertical={true} />
                  <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis yAxisId="left" stroke="#9ca3af" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} tickMargin={10} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} tickMargin={5} domain={[0, 100]} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine yAxisId="left" y={26} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Cooling Threshold', fill: '#ef4444', fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#6b7280" strokeWidth={3} dot={{ r: 4, fill: '#6b7280', strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Occupancy, Controls, Booking Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-3 mt-4 lg:mt-3 mb-6 px-4 lg:px-0">
        <div className="rounded-lg border border-gray-200/60 bg-white shadow-sm p-4 lg:p-6 flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 tracking-tight">Real-Time Occupancy</h3>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">6-Seat detection array</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-100 p-8">
            <div className="grid grid-cols-3 gap-6 sm:gap-8">
              {grid.map((isOccupied, index) => (
                <div 
                  key={index} 
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-colors duration-500 flex items-center justify-center ${
                    isOccupied ? 'bg-red-700 shadow-md transform scale-105' : 'bg-gray-200'
                  }`}
                  title={`Seat ${index + 1}: ${isOccupied ? 'Occupied' : 'Empty'}`}
                >
                  <User size={24} className={isOccupied ? "text-white opacity-90" : "text-gray-400 opacity-60"} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-8">
               <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 rounded-sm bg-red-600 flex items-center justify-center">
                    <User size={8} className="text-white opacity-80"/>
                 </div>
                 <span className="text-xs text-gray-600 font-medium">In Use</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 rounded-sm bg-gray-200 flex items-center justify-center">
                    <User size={8} className="text-gray-400 opacity-60"/>
                 </div>
                 <span className="text-xs text-gray-600 font-medium">Empty</span>
               </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200/60 bg-white shadow-sm p-4 lg:p-6 flex flex-col relative overflow-hidden">
          {pendingAction && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm shadow-inner">
               <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-200/80 max-w-sm text-center mx-4">
                 <h4 className="font-bold text-gray-900 mb-2">Switch to Manual Mode?</h4>
                 <p className="text-sm text-gray-600 mb-5">You’ll need to switch to Manual Mode to change hardware settings.</p>
                 <div className="flex gap-3 justify-center">
                    <button onClick={() => setPendingAction(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => { executeToggle(pendingAction.key, pendingAction.val); setPendingAction(null); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">Continue</button>
                 </div>
               </div>
            </div>
          )}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 tracking-tight">System Control</h3>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">Manage operating modes and hardwares</p>
            </div>
            <Settings2 className="text-gray-400 w-5 h-5" />
          </div>
          
          <div className="flex-1 flex flex-col gap-3 lg:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <button onClick={() => toggleDevice('ac')} className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition-all shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg transition-colors ${devices.ac ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}><Cloud size={20} /></div>
                  <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${devices.ac ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${devices.ac ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">AC Units</p>
                  <p className="text-xs text-gray-500 mt-0.5">{devices.ac ? 'Running...' : 'Standby'}</p>
                </div>
              </button>

              <button onClick={() => toggleDevice('lights')} className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition-all shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg transition-colors ${devices.lights ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}><Lightbulb size={20} /></div>
                  <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${devices.lights ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${devices.lights ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Lighting</p>
                  <p className="text-xs text-gray-500 mt-0.5">{devices.lights ? 'On' : 'Off'}</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div className={`flex flex-col p-4 rounded-xl border border-gray-200 transition-all shadow-sm ${devices.mode === 'auto' ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Thermometer size={16} className="text-gray-500" />
                    <p className="font-semibold text-xs text-gray-800">AC Temp.</p>
                  </div>
                  <span 
                    className="text-lg text-gray-800 tracking-wider" 
                    style={{ fontFamily: "'VT323', monospace", marginTop: "-2px" }}
                  >
                    {devices.targetTemperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex bg-white rounded-md border border-gray-200 overflow-hidden mt-auto">
                  <button onClick={() => toggleDevice('targetTemperature', Math.max(16, devices.targetTemperature - 0.5))} className="flex-1 py-1 flex justify-center hover:bg-gray-100 transition-colors border-r border-gray-200"><Minus size={14} className="text-gray-600" /></button>
                  <button onClick={() => toggleDevice('targetTemperature', Math.min(30, devices.targetTemperature + 0.5))} className="flex-1 py-1 flex justify-center hover:bg-gray-100 transition-colors"><Plus size={14} className="text-gray-600" /></button>
                </div>
              </div>

              <div className={`flex flex-col p-4 rounded-xl border border-gray-200 transition-all shadow-sm ${devices.mode === 'auto' ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Wind size={16} className="text-gray-500" />
                    <p className="font-semibold text-xs text-gray-800">AC Fan Speed</p>
                  </div>
                  <span 
                    className="text-lg text-gray-800 tracking-wider uppercase" 
                    style={{ fontFamily: "'VT323', monospace", marginTop: "-2px" }}
                  >
                    {devices.fanSpeed === 0 ? 'AUTO' : `LV.${devices.fanSpeed}`}
                  </span>
                </div>
                <div className="flex gap-1 mt-auto">
                  {[0, 1, 2, 3].map((speed) => (
                    <button 
                      key={speed}
                      onClick={() => toggleDevice('fanSpeed', speed)}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                        devices.fanSpeed === speed 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {speed === 0 ? '0' : speed}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => toggleDevice('mode')} className="p-4 flex gap-4 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${devices.mode === 'auto' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}><Settings2 size={24} /></div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Operating Mode</p>
                  <p className="text-xs text-gray-500 mt-0.5">{devices.mode === 'auto' ? (devices.controlReason || 'Auto AI Control') : 'Manual Override'}</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${devices.mode === 'auto' ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${devices.mode === 'auto' ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
            </button>

          </div>
        </div>

        <div className="rounded-lg border border-gray-200/60 bg-white shadow-sm p-4 lg:p-6 flex flex-col h-full">
          <div className="mb-4 lg:mb-6 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 tracking-tight">Booking Status</h3>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">Overview of room reservations</p>
            </div>
            <Calendar className="text-gray-400 w-5 h-5" />
          </div>
          
          <div className="flex-1 relative min-h-[300px] lg:min-h-0 mt-0">
            {isLoadingBookings ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-xl border border-gray-200">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : null}
            <div className="absolute inset-0 h-full flex flex-row bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {(() => {
              const statusTypes = ["PENDING", "IN PROGRESS", "UPCOMING", "COMPLETED", "CANCELLED"];
              const activeLabel = expandedBookingStatus || statusTypes[0];
              const activeBookings = dbBookings.filter(b => b.status.label === activeLabel);
              const safeIndex = currentBookingIndex >= activeBookings.length ? 0 : currentBookingIndex;

              return (
                <>
                  {/* Left Side Panel */}
                  <div className="w-[120px] lg:w-[130px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto">
                    {statusTypes.map((statusLabel, idx) => {
                      const isActive = activeLabel === statusLabel;
                      const count = dbBookings.filter(b => b.status.label === statusLabel).length;
                      
                      const activeContainerStyles: Record<string, string> = {
                        'PENDING': 'bg-purple-100 border-purple-300 text-purple-900',
                        'IN PROGRESS': 'bg-blue-100 border-blue-300 text-blue-900',
                        'UPCOMING': 'bg-amber-100 border-amber-300 text-amber-900',
                        'COMPLETED': 'bg-emerald-100 border-emerald-300 text-emerald-900',
                        'CANCELLED': 'bg-red-100 border-red-300 text-red-900',
                      };
                      const activeStyle = activeContainerStyles[statusLabel] || 'bg-gray-100 border-gray-300 text-gray-900';
                      
                      return (
                        <button 
                          key={idx}
                          onClick={() => {
                            setExpandedBookingStatus(statusLabel);
                            setCurrentBookingIndex(0);
                          }}
                          className={`w-full p-3 lg:p-4 flex flex-col items-start text-left border-b transition-colors ${isActive ? activeStyle : 'border-gray-200/60 hover:bg-gray-100 text-gray-500'}`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                              {statusLabel}
                            </span>
                            {count > 0 && (
                              <span className={`font-semibold text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                                {count}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Content Area */}
                  <div className="flex-1 flex flex-col min-w-0 p-3 lg:p-4 overflow-y-hidden relative">
                    {activeBookings.length > 0 ? (
                      <div className="flex flex-col h-full">
                        {(() => {
                           const activeBooking = activeBookings[safeIndex];
                           return (
                             <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                               <div className="flex flex-col min-w-0 pb-2 border-b border-gray-100/50">
                                 <h4 className="font-semibold text-gray-900 text-sm truncate" title={activeBooking.event.name}>{activeBooking.event.name}</h4>
                                 <p className="text-[10px] lg:text-xs text-gray-500 mt-0.5 line-clamp-1" title={activeBooking.event.department}>{activeBooking.event.department}</p>
                               </div>
                               
                               <div className="flex flex-col gap-2.5 flex-1 shrink-0">
                                 <div className="flex items-start gap-2.5 text-xs text-gray-600">
                                   <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                   <div className="flex flex-col min-w-0">
                                     <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Date & Time</span>
                                     <span className="font-medium text-gray-800 line-clamp-1 truncate" title={`${activeBooking.event.date}, ${activeBooking.event.time}`}>{activeBooking.event.date}, {activeBooking.event.time}</span>
                                   </div>
                                 </div>
                                 <div className="flex items-start gap-2.5 text-xs text-gray-600">
                                   <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                   <div className="flex flex-col min-w-0">
                                     <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Venue</span>
                                     <span className="font-medium text-gray-800 line-clamp-1 truncate" title={activeBooking.event.room}>{activeBooking.event.room}</span>
                                   </div>
                                 </div>
                                 <div className="flex items-start gap-2.5 text-xs text-gray-600">
                                   <Package className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                   <div className="flex flex-col min-w-0">
                                     <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Equipment</span>
                                     <span className="font-medium text-gray-800 line-clamp-2" title={activeBooking.event.equipment}>{activeBooking.event.equipment}</span>
                                   </div>
                                 </div>
                               </div>

                               <div className="mt-1 bg-indigo-50/40 rounded-lg p-3 border border-indigo-100/50 flex flex-col gap-1.5 shrink-0">
                                 <div className="flex items-center justify-between">
                                   <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                     <User className="w-3 h-3" /> Prompt
                                   </span>
                                   <span className="text-[9px] font-medium text-indigo-400">{activeBooking.user_prompt.timestamp}</span>
                                 </div>
                                 <p className="text-[11px] lg:text-xs text-gray-700 italic leading-relaxed">
                                   "{activeBooking.user_prompt.message}"
                                 </p>
                               </div>
                             </div>
                           )
                        })()}

                        {/* Navigation Controls */}
                        {activeBookings.length > 1 && (
                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 shrink-0">
                            <button
                              onClick={() => setCurrentBookingIndex(prev => Math.max(0, prev - 1))}
                              disabled={safeIndex === 0}
                              className={`p-1.5 rounded-md transition-colors ${safeIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'}`}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs text-gray-500 font-medium">
                              {safeIndex + 1} <span className="text-gray-300 mx-1">/</span> {activeBookings.length}
                            </span>
                            <button
                              onClick={() => setCurrentBookingIndex(prev => Math.min(activeBookings.length - 1, prev + 1))}
                              disabled={safeIndex === activeBookings.length - 1}
                              className={`p-1.5 rounded-md transition-colors ${safeIndex === activeBookings.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'}`}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm h-full absolute inset-0">No bookings in this status</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>

      {/* --- MQTT System & AI Terminal Log --- */}
      <div className="px-4 lg:px-0 mb-6">
        <div className="rounded-lg border border-gray-800 bg-[#0c0c0c] shadow-lg flex flex-col overflow-hidden">
          
          <div className="px-4 py-1.75 flex justify-between items-center bg-[#1a1a1a] border-b border-gray-800">
            <div className="relative flex bg-[#0f0f0f] p-1 rounded-lg border border-gray-800">
              <div 
                className={`absolute top-1 bottom-1 left-1 w-24 bg-[#2a2a2a] rounded-md shadow-sm transition-transform duration-300 ease-out ${
                  activeLogTab === 'ai' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />

              <button 
                onClick={() => { setActiveLogTab('system'); setSelectedLog(null); }}
                className={`relative z-10 w-24 py-1.5 rounded-md transition-colors duration-300 ${
                  activeLogTab === 'system' 
                    ? 'text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-center">System</h3>
              </button>
              
              <button 
                onClick={() => { setActiveLogTab('ai'); setSelectedLog(null); }}
                className={`relative z-10 w-24 py-1.5 rounded-md transition-colors duration-300 ${
                  activeLogTab === 'ai' 
                    ? 'text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-center">AI Agent</h3>
              </button>
            </div>
            
            <button 
              onClick={() => {
                if (activeLogTab === 'system') setLogs([]);
                else setAiLogs([]);
                setSelectedLog(null);
              }} 
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium"
            >
              Clear Log
            </button>
          </div>

          <div className="flex flex-row h-72 w-full overflow-hidden">
            <div className={`flex flex-col h-full ${selectedLog ? 'w-full sm:w-1/2 md:w-3/5 border-r border-gray-800' : 'w-full'}`}>
              
              {/* --- Interactive Dropdown Header for Topics --- */}
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#0f0f0f] border-b border-gray-800 font-mono text-[10px] text-gray-500 uppercase tracking-widest font-semibold shrink-0">
                <div className="w-28 xl:w-32 shrink-0">Timestamp</div>
                
                <div className="w-32 xl:w-40 shrink-0 relative" ref={topicDropdownRef}>
                  <button 
                    onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                    className="flex items-center gap-1 hover:text-gray-300 transition-colors uppercase font-semibold tracking-widest focus:outline-none"
                  >
                    Topic <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown Menu */}
                  {isTopicDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-gray-700 shadow-xl z-50 py-1">
                      {uniqueTopics.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No topics yet</div>
                      ) : (
                        uniqueTopics.map(topic => (
                          <label key={topic} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              className="appearance-none w-4 h-4 rounded border border-gray-600 bg-[#0f0f0f] cursor-pointer relative
                                            after:content-[''] after:absolute after:left-1/2 after:top-1/2
                                            after:w-[4px] after:h-[8px]
                                            after:border-white after:border-r-2 after:border-b-2
                                            after:rotate-45 after:-translate-x-1/2 after:-translate-y-1/2
                                            after:opacity-0 checked:after:opacity-100"
                              checked={!hiddenTopics.includes(topic)}
                              onChange={() => toggleTopicVisibility(topic)}
                            />
                            <span 
                                className="text-xs text-gray-300 truncate" 
                                title={topic}
                                >
                                {topic.replace(/^scada-i-demo/, '')}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full">Content</div>
              </div>
              
              {/* List Body mapping over filteredLogs */}
              <div className={`p-2 overflow-y-auto font-mono text-xs flex flex-col gap-1 flex-1 ${consoleScrollbar}`}>
                {filteredLogs.length === 0 ? (
                  <div className="p-2 text-gray-600 italic">Waiting for incoming messages or all channels filtered out...</div>
                ) : (
                  filteredLogs.map(log => (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`flex flex-col sm:flex-row items-start sm:gap-3 p-2 rounded-md cursor-pointer transition-colors border ${
                        selectedLog?.id === log.id 
                          ? 'bg-[#1e1e1e] border-gray-700 shadow-inner' 
                          : 'border-transparent hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center gap-2 shrink-0 mb-1 sm:mb-0 w-28 xl:w-32">
                        <span className="text-gray-500 shrink-0">[{log.time}]</span>
                        <span className={`shrink-0 font-bold px-1.5 rounded-sm flex items-center gap-1 ${
                        log.type === 'IN' 
                            ? (activeLogTab === 'ai' ? 'bg-purple-950 text-purple-400' : 'bg-emerald-950 text-emerald-400') 
                            : 'bg-blue-950 text-blue-400'
                        }`}>
                        {log.type}
                        {log.type === 'IN' && activeLogTab === 'ai' && (
                            <Bot className="w-3 h-3" />
                        )}
                        </span>
                      </div>
                      <div className="text-gray-400 shrink-0 w-32 xl:w-40 truncate" title={log.topic}>{log.topic}</div>
                      <div className="text-gray-300 truncate w-full">{log.payload}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedLog && (
              <div className="hidden sm:flex flex-col h-full bg-[#0a0a0a] w-1/2 md:w-2/5 shrink-0 border-l border-gray-800">
                <div className="px-4 py-2 bg-[#121212] border-b border-gray-800 flex justify-between items-center shrink-0">
                  <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                    Payload Inspector
                  </span>
                  <button 
                    onClick={() => setSelectedLog(null)} 
                    className="text-gray-500 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                <div className={`p-4 overflow-y-auto flex-1 font-mono text-xs flex flex-col gap-4 ${consoleScrollbar}`}>
                  <div>
                    <span className="text-gray-600 text-[10px] uppercase font-semibold block mb-1">Topic</span>
                    <div className="text-blue-400 break-all bg-[#121212] p-2 rounded border border-gray-800/50">
                      {selectedLog.topic}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col min-h-0">
                    <span className="text-gray-600 text-[10px] uppercase font-semibold block mb-1">Payload Data</span>
                    <div className={`bg-[#121212] p-3 rounded-md border border-gray-800/50 flex-1 overflow-y-auto whitespace-pre-wrap break-all ${consoleScrollbar}`}>
                      {renderPayload(selectedLog.payload)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

    </div>
  );
}