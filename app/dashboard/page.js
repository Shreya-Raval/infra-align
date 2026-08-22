"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

const CATEGORY_COLORS = {
  Roads: "#6366f1", // Indigo
  "Water Supply": "#0ea5e9", // Sky
  Electricity: "#eab308", // Yellow/Amber
  "Sanitation/Health": "#10b981", // Emerald
  Education: "#a855f7", // Purple
  Other: "#64748b", // Slate
};

const STATUS_COLORS = {
  Registered: "#94a3b8", // Slate
  "In Progress": "#f59e0b", // Amber
  Closed: "#10b981", // Emerald
  Withdrawn: "#f43f5e", // Rose
};

const URGENCY_COLORS = {
  1: "#10b981", // Low - Green
  2: "#06b6d4", // Cyan
  3: "#f59e0b", // Moderate - Amber
  4: "#f97316", // High - Orange
  5: "#ef4444", // Critical - Red
};

function getComplaintState(c) {
  if (c.state && typeof c.state === "string" && c.state.trim()) {
    return c.state.trim();
  }
  if (
    c.statusChangedByState &&
    typeof c.statusChangedByState === "string" &&
    c.statusChangedByState.trim()
  ) {
    return c.statusChangedByState.trim();
  }
  if (c.location && typeof c.location === "string") {
    const parts = c.location.split(",").map((p) => p.trim());
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    return parts[0] || "Unspecified";
  }
  return "Unspecified";
}

function isToday(date) {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export default function DashboardPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComplaints(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load dashboard complaints:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Calculations
  const nonWithdrawn = complaints.filter(
    (c) => (c.status || "registered").toLowerCase() !== "withdrawn"
  );

  // 1. Category Breakdown (Pie Chart) - Excl. Withdrawn
  const categoryCounts = {};
  nonWithdrawn.forEach((c) => {
    const cat = c.category || "Other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    value: categoryCounts[cat],
  }));

  // 2. State Breakdown (Bar Chart) - Excl. Withdrawn
  const stateCounts = {};
  nonWithdrawn.forEach((c) => {
    const st = getComplaintState(c);
    stateCounts[st] = (stateCounts[st] || 0) + 1;
  });
  const stateData = Object.keys(stateCounts)
    .map((st) => ({
      state: st,
      count: stateCounts[st],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 states/cities

  // 3. Today's Complaint Count
  const todayCount = complaints.filter((c) => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    return isToday(d);
  }).length;

  // 4. Status Breakdown (Pie/Bar Chart) - Incl. Withdrawn
  const statusCounts = {
    Registered: 0,
    "In Progress": 0,
    Closed: 0,
    Withdrawn: 0,
  };
  complaints.forEach((c) => {
    const s = (c.status || "registered").toLowerCase();
    if (s === "in progress") statusCounts["In Progress"]++;
    else if (s === "closed") statusCounts.Closed++;
    else if (s === "withdrawn") statusCounts.Withdrawn++;
    else statusCounts.Registered++;
  });
  const statusData = Object.keys(statusCounts).map((s) => ({
    name: s,
    value: statusCounts[s],
  }));

  // 5. Urgency Distribution (Bar Chart) - Excl. Withdrawn
  const urgencyCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  nonWithdrawn.forEach((c) => {
    const u = Number(c.urgency);
    if (u >= 1 && u <= 5) {
      urgencyCounts[u]++;
    }
  });
  const urgencyData = [1, 2, 3, 4, 5].map((level) => ({
    level: `Level ${level}`,
    urgencyNumber: level,
    count: urgencyCounts[level],
  }));

  // 6. Average Resolution Time (for closed complaints with timestamps)
  const resolvedWithTimestamps = complaints.filter((c) => {
    const isClosed = (c.status || "").toLowerCase() === "closed";
    return isClosed && c.createdAt?.toDate && c.statusChangedAt?.toDate;
  });

  let avgResolutionDays = "Not enough data yet";
  if (resolvedWithTimestamps.length > 0) {
    const totalDiffMs = resolvedWithTimestamps.reduce((acc, c) => {
      const created = c.createdAt.toDate().getTime();
      const resolved = c.statusChangedAt.toDate().getTime();
      return acc + Math.max(0, resolved - created);
    }, 0);
    const avgMs = totalDiffMs / resolvedWithTimestamps.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);
    avgResolutionDays = `${avgDays.toFixed(1)} days`;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2.5">
            📊 Public Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Civic Intelligence & Stats Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time municipal performance metrics, resolution velocity, and infrastructure health analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastRefreshed && (
            <span className="text-xs text-slate-400">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={fetchComplaints}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>🔄</span>
            <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Aggregating public platform metrics...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl mx-auto mb-3 text-slate-400">
            📊
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            No complaints registered yet
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            As citizens report issues and managers resolve tickets, visual analytics will populate automatically.
          </p>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all"
          >
            Report the First Issue →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Active Issues */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Active Reports
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {nonWithdrawn.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total registered & in-progress
              </div>
            </div>

            {/* Today's Complaints */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Today&apos;s Reports
              </div>
              <div className="text-3xl font-extrabold text-indigo-600">
                {todayCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Submitted in the current calendar day
              </div>
            </div>

            {/* Resolved Count */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Resolved Complaints
              </div>
              <div className="text-3xl font-extrabold text-emerald-600">
                {statusCounts.Closed}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Successfully closed by managers
              </div>
            </div>

            {/* Average Resolution Time */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Avg. Resolution Time
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {avgResolutionDays}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                From creation to closed timestamp
              </div>
            </div>
          </div>

          {/* Charts Row 1: Category Breakdown & Status Breakdown */}
          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Pie Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Category Breakdown
                  </h2>
                  <span className="text-xs text-slate-500">Excl. withdrawn</span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[entry.name] || "#64748b"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.75rem",
                          fontSize: "0.75rem",
                          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown Pie/Donut Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Status Distribution
                  </h2>
                  <span className="text-xs text-slate-500">All submissions</span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-status-${index}`}
                            fill={STATUS_COLORS[entry.name] || "#64748b"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.75rem",
                          fontSize: "0.75rem",
                          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row 2: State Breakdown & Urgency Distribution */}
          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* State Breakdown Bar Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Top Regional Hotspots
                  </h2>
                  <span className="text-xs text-slate-500">By State / City</span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stateData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="state"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.75rem",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Urgency Distribution Bar Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Urgency Severity (1-5)
                  </h2>
                  <span className="text-xs text-slate-500">Excl. withdrawn</span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={urgencyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="level"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.75rem",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {urgencyData.map((entry, index) => (
                          <Cell
                            key={`urgency-bar-${index}`}
                            fill={URGENCY_COLORS[entry.urgencyNumber] || "#6366f1"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
