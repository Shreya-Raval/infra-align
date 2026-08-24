/** Shared theme-aware UI class maps (light + dark). */

export const STATUS_BADGE_CLASSES = {
  registered:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600",
  "in progress":
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
  closed:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  withdrawn:
    "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
};

export function getStatusBadgeClass(status) {
  const key = (status || "registered").toLowerCase();
  return STATUS_BADGE_CLASSES[key] || STATUS_BADGE_CLASSES.registered;
}

export const URGENCY_BADGE_CLASSES = {
  high: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  medium:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
  low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600",
};

export function chartTooltipStyle(isDark) {
  if (isDark) {
    return {
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      borderRadius: "0.75rem",
      fontSize: "0.75rem",
      color: "#f1f5f9",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    };
  }
  return {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.75rem",
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
  };
}

export function chartAxisTick(isDark) {
  return { fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" };
}

export function chartGridStroke(isDark) {
  return isDark ? "#334155" : "#f1f5f9";
}
