"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
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
import {
  chartTooltipStyle,
  chartAxisTick,
  chartGridStroke,
} from "@/lib/uiTheme";
import { IconRefresh, IconChart } from "@/components/Icons";

const CATEGORY_COLORS = {
  Roads: "#6366f1",
  "Water Supply": "#0ea5e9",
  Electricity: "#eab308",
  "Sanitation/Health": "#10b981",
  Education: "#a855f7",
  Other: "#64748b",
};

const STATUS_COLORS = {
  Registered: "#94a3b8",
  "In Progress": "#f59e0b",
  Closed: "#10b981",
  Withdrawn: "#f43f5e",
};

const URGENCY_COLORS = {
  1: "#10b981",
  2: "#06b6d4",
  3: "#f59e0b",
  4: "#f97316",
  5: "#ef4444",
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  const nonWithdrawn = complaints.filter(
    (c) => (c.status || "registered").toLowerCase() !== "withdrawn"
  );

  const categoryCounts = {};
  nonWithdrawn.forEach((c) => {
    const cat = c.category || "Other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    value: categoryCounts[cat],
  }));

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
    .slice(0, 10);

  const todayCount = complaints.filter((c) => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    return isToday(d);
  }).length;

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

  const tooltipStyle = chartTooltipStyle(isDark);
  const axisTick = chartAxisTick(isDark);
  const gridStroke = chartGridStroke(isDark);
  const legendStyle = {
    fontSize: "0.75rem",
    paddingTop: "0.5rem",
    color: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
        <div>
          <p className="ia-eyebrow">Overview</p>
          <h1 className="ia-heading">Civic Intelligence & Stats Dashboard</h1>
          <p className="ia-subtext mt-1">
            Real-time municipal performance metrics, resolution velocity, and
            infrastructure health analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {lastRefreshed.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={fetchComplaints}
            disabled={loading}
            className="ia-btn-secondary px-3.5 py-2 cursor-pointer disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Aggregating public platform metrics...
          </p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="ia-card p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <IconChart className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            No complaints registered yet
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            As citizens report issues and managers resolve tickets, visual
            analytics will populate automatically.
          </p>
          <Link
            href="/report"
            className="ia-btn-primary px-5 py-2.5"
          >
            Report the First Issue →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ia-card p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Active Reports
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {nonWithdrawn.length}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Total registered & in-progress
              </div>
            </div>

            <div className="ia-card p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Today&apos;s Reports
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {todayCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Submitted in the current calendar day
              </div>
            </div>

            <div className="ia-card p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Resolved Complaints
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {statusCounts.Closed}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Successfully closed by managers
              </div>
            </div>

            <div className="ia-card p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Avg. Resolution Time
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1">
                {avgResolutionDays}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                From creation to closed timestamp
              </div>
            </div>
          </div>

          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="ia-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    Category Breakdown
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Excl. withdrawn
                  </span>
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
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={legendStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ia-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    Status Distribution
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    All submissions
                  </span>
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
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={legendStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="ia-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    Top Regional Hotspots
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    By State / City
                  </span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stateData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis
                        dataKey="state"
                        tick={axisTick}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="count"
                        fill={isDark ? "#818cf8" : "#6366f1"}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ia-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    Urgency Severity (1-5)
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Excl. withdrawn
                  </span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={urgencyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="level" tick={axisTick} />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip contentStyle={tooltipStyle} />
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
