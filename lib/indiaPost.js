const API_BASE = "https://api.postalpincode.in";

export function normalizeLocationText(value) {
  return (value || "").trim().toLowerCase();
}

function parsePostOfficeResponse(data) {
  if (
    !Array.isArray(data) ||
    data.length === 0 ||
    data[0].Status !== "Success" ||
    !Array.isArray(data[0].PostOffice)
  ) {
    return [];
  }
  return data[0].PostOffice;
}

/** @returns {Promise<Array>} */
export async function fetchPostOfficesByPincode(pincode) {
  const res = await fetch(`${API_BASE}/pincode/${pincode}`);
  const data = await res.json();
  return parsePostOfficeResponse(data);
}

/** @returns {Promise<Array>} */
export async function searchPostOfficesByName(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const res = await fetch(`${API_BASE}/postoffice/${encodeURIComponent(trimmed)}`);
  const data = await res.json();
  return parsePostOfficeResponse(data);
}

/** Unique city (district) + state pairs for dropdown options. */
export function districtStateOptionsFromPostOffices(postOffices) {
  const map = new Map();

  for (const po of postOffices) {
    const city = (po.District || po.Name || "").trim();
    const state = (po.State || "").trim();
    if (!city || !state) continue;

    const key = `${city}|${state}`;
    if (!map.has(key)) {
      map.set(key, { key, city, state });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const byCity = a.city.localeCompare(b.city);
    return byCity !== 0 ? byCity : a.state.localeCompare(b.state);
  });
}

export function pincodeMatchesCityState(postOffices, city, state) {
  const targetCity = normalizeLocationText(city);
  const targetState = normalizeLocationText(state);

  if (!targetCity || !targetState) return false;

  return postOffices.some((po) => {
    const poState = normalizeLocationText(po.State);
    const district = normalizeLocationText(po.District);
    const name = normalizeLocationText(po.Name);
    return poState === targetState && (district === targetCity || name === targetCity);
  });
}

export function validateLocationFields({ pincode, city, state }) {
  const code = (pincode || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return "Please enter a valid 6-digit pincode.";
  }
  if (!(city || "").trim()) {
    return "Please select a city.";
  }
  if (!(state || "").trim()) {
    return "State is required — select a city to populate it.";
  }
  return null;
}

export async function validatePincodeAgainstCityState(pincode, city, state) {
  const syncError = validateLocationFields({ pincode, city, state });
  if (syncError) return syncError;

  try {
    const postOffices = await fetchPostOfficesByPincode(pincode.trim());
    if (!postOffices.length) {
      return "Pincode not found. Check the number and try again.";
    }
    if (!pincodeMatchesCityState(postOffices, city, state)) {
      return `Pincode ${pincode.trim()} does not match ${city.trim()}, ${state.trim()}.`;
    }
    return null;
  } catch {
    return "Could not verify pincode online. Check your connection and try again.";
  }
}
