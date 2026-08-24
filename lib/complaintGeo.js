const DEFAULT_CATEGORY = "Other";

export function getComplaintState(c) {
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
    const parts = c.location.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }
  return "Unspecified";
}

export function getComplaintCity(c) {
  if (c.city && typeof c.city === "string" && c.city.trim()) {
    return c.city.trim();
  }
  if (c.location && typeof c.location === "string") {
    const parts = c.location.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return parts[parts.length - 2];
    }
    if (parts.length === 2) {
      return parts[0];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }
  return "Unspecified";
}

export function isGeocodedComplaint(c) {
  return (
    typeof c.lat === "number" &&
    typeof c.lng === "number" &&
    !Number.isNaN(c.lat) &&
    !Number.isNaN(c.lng)
  );
}

export function isActiveComplaint(c) {
  return (c.status || "registered").toLowerCase() !== "withdrawn";
}

function normalizeCategory(category) {
  if (category && typeof category === "string" && category.trim()) {
    return category.trim();
  }
  return DEFAULT_CATEGORY;
}

function buildCategoryCounts(complaints) {
  const counts = {};
  for (const c of complaints) {
    const cat = normalizeCategory(c.category);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

function getDominantCategory(categoryCounts) {
  let top = DEFAULT_CATEGORY;
  let topCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > topCount) {
      top = cat;
      topCount = count;
    }
  }
  return top;
}

function averageCenter(complaints) {
  if (complaints.length === 0) return null;
  const sum = complaints.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
    { lat: 0, lng: 0 }
  );
  return [sum.lat / complaints.length, sum.lng / complaints.length];
}

/**
 * @param {Array} complaints - geocoded, active complaints
 * @param {"state"|"city"} level
 * @param {string|null} stateFilter - when set, only aggregate cities in this state
 */
export function aggregateComplaintRegions(complaints, level, stateFilter = null) {
  const groups = new Map();

  for (const c of complaints) {
    const state = getComplaintState(c);
    if (stateFilter && state !== stateFilter) continue;

    const key =
      level === "state"
        ? state
        : `${state}::${getComplaintCity(c)}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        level,
        name: level === "state" ? state : getComplaintCity(c),
        state,
        complaints: [],
      });
    }
    groups.get(key).complaints.push(c);
  }

  const regions = [];

  for (const group of groups.values()) {
    const count = group.complaints.length;
    if (count === 0) continue;

    const categoryCounts = buildCategoryCounts(group.complaints);
    const center = averageCenter(group.complaints);
    if (!center) continue;

    regions.push({
      ...group,
      count,
      center,
      categoryCounts,
      dominantCategory: getDominantCategory(categoryCounts),
    });
  }

  return regions.sort((a, b) => b.count - a.count);
}
