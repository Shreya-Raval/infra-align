export const CATEGORY_COLORS = {
  Roads: "#6366f1",
  "Water Supply": "#0ea5e9",
  Electricity: "#eab308",
  "Sanitation/Health": "#10b981",
  Education: "#a855f7",
  Other: "#64748b",
};

export const CATEGORY_ORDER = [
  "Roads",
  "Water Supply",
  "Electricity",
  "Sanitation/Health",
  "Education",
  "Other",
];

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

/** State view below this zoom; city view at and above (unless state-focused). */
export const CITY_ZOOM_THRESHOLD = 7;

export function getBubbleRadius(count, maxCount, isCity = false) {
  const minR = isCity ? 10 : 16;
  const maxR = isCity ? 32 : 52;
  if (!count || maxCount <= 0) return minR;
  const t = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + t * (maxR - minR);
}

export function getBubbleOpacity(count, maxCount) {
  const min = 0.42;
  const max = 0.88;
  if (!count || maxCount <= 0) return min;
  const t = count / maxCount;
  return min + t * (max - min);
}
