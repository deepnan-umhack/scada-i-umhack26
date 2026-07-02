import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Cpu, RefreshCw } from "lucide-react";

type TriggerState = "Healthy" | "Retraining Required";

const consoleScrollbar = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-gray-900 hover:[&::-webkit-scrollbar-thumb]:bg-gray-600";

type ConsoleEntry = {
  level: "INFO" | "WARN" | "SUCCESS";
  message: string;
  time: string;
};

type TriggerEntry = {
  id: number;
  week: string;
  room: string;
  model: string;
  status: TriggerState;
  drift: number;
  accuracy: number;
  retrainNeeded: boolean;
  approved: boolean;
};

const initialTriggerHistory: TriggerEntry[] = [
  {
    id: 1,
    week: "Week 26",
    room: "Pentium Room 1",
    model: "LightGBM - Occupancy Optimizer",
    status: "Retraining Required",
    drift: 16.2,
    accuracy: 91.4,
    retrainNeeded: true,
    approved: false,
  },
  {
    id: 2,
    week: "Week 25",
    room: "Pentium Room 2",
    model: "LightGBM - Adaptive Cooling",
    status: "Healthy",
    drift: 8.9,
    accuracy: 94.1,
    retrainNeeded: false,
    approved: false,
  },
  {
    id: 3,
    week: "Week 24",
    room: "Athlon Room 1",
    model: "LightGBM - Comfort Balance",
    status: "Healthy",
    drift: 4.7,
    accuracy: 96.2,
    retrainNeeded: false,
    approved: true,
  },
  {
    id: 4,
    week: "Week 23",
    room: "Athlon Room 2",
    model: "LightGBM - Demand Response",
    status: "Healthy",
    drift: 2.1,
    accuracy: 97.1,
    retrainNeeded: false,
    approved: true,
  },
];

const initialConsoleLogs: ConsoleEntry[] = [
  {
    level: "INFO",
    message: "Awaiting retraining request...",
    time: "00:00:00",
  },
];

const roomFleet = [
  {
    room: "Pentium Room 1",
    model: "Occupancy Optimizer",
    health: 84,
  },
  {
    room: "Pentium Room 2",
    model: "Adaptive Cooling",
    health: 92,
  },
  {
    room: "Athlon Room 1",
    model: "Comfort Balance",
    health: 96,
  },
  {
    room: "Athlon Room 2",
    model: "Demand Response",
    health: 98,
  },
];

export default function ModelGovernance() {
  const [history, setHistory] = useState(initialTriggerHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>(initialConsoleLogs);
  const [isStreaming, setIsStreaming] = useState(false);
  const trainingTimerRef = useRef<number | null>(null);

  const averageHealth = Math.round(
    roomFleet.reduce((sum, room) => sum + room.health, 0) / roomFleet.length
  );

  useEffect(() => {
    return () => {
      if (trainingTimerRef.current) {
        window.clearTimeout(trainingTimerRef.current);
      }
    };
  }, []);

  const startMockRetrainingStream = (entry: TriggerEntry) => {
    if (trainingTimerRef.current) {
      window.clearTimeout(trainingTimerRef.current);
    }

    setIsStreaming(true);
    const baseTime = new Date().toLocaleTimeString([], { hour12: false });
    setConsoleLogs([
      {
        level: "INFO",
        time: baseTime,
        message: `[Retraining] Starting LightGBM refresh for ${entry.room}`,
      },
    ]);

    const steps: ConsoleEntry[] = [
      {
        level: "INFO",
        time: baseTime,
        message: `[HVAC Agent] Drift threshold exceeded at ${entry.drift.toFixed(1)}%`,
      },
      {
        level: "INFO",
        time: baseTime,
        message: `[Data] Sampling recent occupancy and comfort signals...`,
      },
      {
        level: "INFO",
        time: baseTime,
        message: `[Model] Rebalancing feature weights for ${entry.model}`,
      },
      {
        level: "WARN",
        time: baseTime,
        message: `[Validation] Checking for anomalies in the latest room telemetry`,
      },
      {
        level: "SUCCESS",
        time: baseTime,
        message: `[Complete] Retraining cycle finalized and model checkpoint saved`,
      },
    ];

    let index = 0;
    const queueNext = () => {
      if (index >= steps.length) {
        setIsStreaming(false);
        return;
      }

      const nextEntry = steps[index];
      if (!nextEntry) {
        setIsStreaming(false);
        return;
      }

      setConsoleLogs((prev) => [...prev, nextEntry]);
      index += 1;
      trainingTimerRef.current = window.setTimeout(queueNext, 750);
    };

    trainingTimerRef.current = window.setTimeout(queueNext, 600);
  };

  const filteredHistory = history.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.week.toLowerCase().includes(query) ||
      entry.room.toLowerCase().includes(query) ||
      entry.model.toLowerCase().includes(query)
    );
  });

  const handleApproveRetrain = (id: number) => {
    const targetEntry = history.find((entry) => entry.id === id);

    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, approved: true } : entry
      )
    );

    if (targetEntry) {
      startMockRetrainingStream(targetEntry);
    }
  };

  return (
    <div className="w-full pb-6 lg:pb-0 font-sans text-gray-900 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 px-4 pt-4 lg:px-0 lg:pt-0">
        <div>
          <nav className="flex items-center space-x-2 text-sm font-medium text-gray-500 mb-2">
            <Link to="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
            <span className="text-gray-400 px-1">•</span>
            <Link to="/dashboard/esg-reports" className="hover:text-gray-900 transition-colors">ESG Reports</Link>
            <span className="text-gray-400 px-1">•</span>
            <span className="text-[#0000FF] underline font-semibold">Model Governance</span>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
            HVAC Model Governance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor LightGBM room models, weekly drift checks, and retraining policy
          </p>
        </div>

      </div>

      {/* <div className="grid gap-4 lg:grid-cols-3 mb-6 px-4 lg:px-0">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Fleet health</p>
              <p className="text-2xl font-semibold mt-1">{averageHealth}%</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">All active room models remain within the policy guardrails.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Weekly drift checks</p>
              <p className="text-2xl font-semibold mt-1">4/4 rooms</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Activity size={18} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">The HVAC agent evaluates every deployed model every week for data drift.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending retraining</p>
              <p className="text-2xl font-semibold mt-1">{pendingRetrainCount}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Approval is required unless autonomous retraining is enabled.</p>
        </div>
      </div> */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6 px-4 lg:px-0">
        <div className="border-b border-gray-200 bg-gray-50/70 px-4 lg:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Model Fleet Overview</h3>
            <p className="text-sm text-gray-500">Each room runs a dedicated LightGBM model that optimizes comfort and energy use.</p>
          </div>
          {/* <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <Sparkles size={14} />
            Weekly governance loop active
          </div> */}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 p-4 lg:p-6">
          {roomFleet.map((room) => (
            <div key={room.room} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-900">{room.room}</p>
                <p className="text-xs text-gray-500 mt-1">{room.model}</p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Health score</span>
                  <span className="font-semibold text-gray-700">{room.health}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${room.health}%` }} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Cpu size={14} />
                LightGBM policy runtime active
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr] px-4 lg:px-0">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50/70 px-4 lg:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Trigger History</h3>
              <p className="text-sm text-gray-500">Weekly training outcomes and retraining decisions.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search room or week..."
                className="w-full h-10 rounded-none border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-0"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredHistory.map((entry) => (
              <div key={entry.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 lg:px-6 py-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{entry.week}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      entry.status === "Retraining Required"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {entry.room} • {entry.model}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Drift {entry.drift}% • Accuracy {entry.accuracy}%
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {entry.retrainNeeded ? (
                    <button
                      onClick={() => handleApproveRetrain(entry.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      <CheckCircle2 size={15} />
                      Approve Retrain
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 size={15} />
                      Healthy
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-[#0c0c0c] shadow-lg flex flex-col overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-[#1a1a1a] border-b border-gray-800">
            <div className="text-[11px] font-medium text-gray-500">
              Retraining Console
            </div>
            <div className="text-[11px] font-medium text-gray-500">
              {isStreaming ? "in progress" : "idle"}
            </div>
          </div>

          <div className="flex flex-col h-[320px] w-full overflow-hidden">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#0f0f0f] border-b border-gray-800 font-mono text-[10px] text-gray-500 uppercase tracking-widest font-semibold shrink-0">
              <div className="w-28 shrink-0">Timestamp</div>
              <div className="w-24 shrink-0">Level</div>
              <div className="w-full">Message</div>
            </div>

            <div className={`p-2 overflow-y-auto font-mono text-xs flex flex-col gap-1 flex-1 ${consoleScrollbar}`}>
              {(consoleLogs ?? []).filter(Boolean).map((entry, index) => {
                const safeEntry = entry as ConsoleEntry;
                return (
                  <div
                    key={`${safeEntry.time || "00:00:00"}-${index}`}
                    className="flex flex-col sm:flex-row items-start sm:gap-3 p-2 rounded-md border border-transparent hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-2 shrink-0 mb-1 sm:mb-0 w-28">
                      <span className="text-gray-500">[{safeEntry.time}]</span>
                    </div>
                    <div className={`shrink-0 w-24 font-semibold ${safeEntry.level === "WARN" ? "text-amber-400" : safeEntry.level === "SUCCESS" ? "text-emerald-400" : "text-sky-300"}`}>
                      {safeEntry.level}
                    </div>
                    <div className="text-gray-300 truncate w-full">{safeEntry.message}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
