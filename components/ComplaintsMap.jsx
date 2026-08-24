"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { countryConfig } from "@/lib/countryConfig";
import {
  aggregateComplaintRegions,
  isActiveComplaint,
  isGeocodedComplaint,
} from "@/lib/complaintGeo";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  CITY_ZOOM_THRESHOLD,
  getBubbleOpacity,
  getBubbleRadius,
  getCategoryColor,
} from "@/lib/mapTheme";
import { useTheme } from "next-themes";

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 150);

    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") {
      return () => clearTimeout(timer);
    }

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function MapNavigationController({ config, resetCounter }) {
  const map = useMap();

  useEffect(() => {
    map.setView(config.mapCenter, config.mapZoom, { animate: false });
  }, [config.mapCenter, config.mapZoom, map]);

  useEffect(() => {
    if (resetCounter > 0) {
      map.flyTo(config.mapCenter, config.mapZoom, { duration: 0.75 });
    }
  }, [resetCounter, config.mapCenter, config.mapZoom, map]);

  return null;
}

function ZoomTracker({ onZoomChange }) {
  const map = useMap();

  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function RegionPopupContent({ region }) {
  const breakdown = CATEGORY_ORDER.filter(
    (cat) => region.categoryCounts[cat] > 0
  ).concat(
    Object.keys(region.categoryCounts).filter(
      (cat) => !CATEGORY_ORDER.includes(cat) && region.categoryCounts[cat] > 0
    )
  );

  return (
    <div className="text-xs leading-relaxed space-y-2 min-w-[200px]">
      <div>
        <div className="font-bold text-foreground text-sm">{region.name}</div>
        {region.level === "city" && region.state && (
          <div className="text-muted-foreground text-[11px]">{region.state}</div>
        )}
        <div className="text-muted-foreground mt-0.5">
          {region.count} active report{region.count === 1 ? "" : "s"}
        </div>
      </div>

      <div className="pt-1 border-t border-border/60 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Category mix
        </div>
        {breakdown.map((cat) => {
          const n = region.categoryCounts[cat];
          const pct = Math.round((n / region.count) * 100);
          return (
            <div key={cat} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-foreground/90">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(cat) }}
                  />
                  {cat}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {n} ({pct}%)
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: getCategoryColor(cat),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
        Dominant:{" "}
        <span className="font-semibold" style={{ color: getCategoryColor(region.dominantCategory) }}>
          {region.dominantCategory}
        </span>
      </div>
    </div>
  );
}

function MapLegend({ mode, focusedState }) {
  return (
    <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>
          {mode === "city"
            ? focusedState
              ? `City breakdown · ${focusedState}`
              : "City breakdown"
            : "State breakdown · click a state to drill down"}
        </span>
        <span className="hidden sm:inline text-border">|</span>
        <span>Size &amp; brightness = volume</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {CATEGORY_ORDER.map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ComplaintsMap({ country = "IN" }) {
  const config = countryConfig[country] || countryConfig.IN;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [complaints, setComplaints] = useState([]);
  const [mapZoom, setMapZoom] = useState(config.mapZoom);
  const [focusedState, setFocusedState] = useState(null);
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComplaints(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setFocusedState(null);
    setResetCounter((c) => c + 1);
  }, [country]);

  const activeGeocoded = useMemo(
    () => complaints.filter((c) => isGeocodedComplaint(c) && isActiveComplaint(c)),
    [complaints]
  );

  const showCityLevel =
    focusedState !== null || mapZoom >= CITY_ZOOM_THRESHOLD;

  const regions = useMemo(
    () =>
      aggregateComplaintRegions(
        activeGeocoded,
        showCityLevel ? "city" : "state",
        focusedState
      ),
    [activeGeocoded, showCityLevel, focusedState]
  );

  const maxCount = useMemo(
    () => (regions.length ? Math.max(...regions.map((r) => r.count)) : 1),
    [regions]
  );

  const handleZoomChange = useCallback((zoom) => {
    setMapZoom(zoom);
    if (zoom < CITY_ZOOM_THRESHOLD) {
      setFocusedState(null);
    }
  }, []);

  const handleStateFocus = useCallback((region, map) => {
    if (region.level !== "state") return;
    setFocusedState(region.name);
    map.flyTo(region.center, CITY_ZOOM_THRESHOLD, { duration: 0.75 });
  }, []);

  return (
    <div>
      {focusedState && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing cities in <strong className="text-foreground">{focusedState}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setFocusedState(null);
              setResetCounter((c) => c + 1);
            }}
            className="ia-btn-secondary px-3 py-1.5 text-xs cursor-pointer"
          >
            View all states
          </button>
        </div>
      )}

      <div className="h-[70vh] min-h-[450px] w-full rounded-2xl overflow-hidden border border-border/90 shadow-sm relative bg-muted">
        <MapContainer
          center={config.mapCenter}
          zoom={config.mapZoom}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <MapResizeHandler />
          <MapNavigationController config={config} resetCounter={resetCounter} />
          <ZoomTracker onZoomChange={handleZoomChange} />

          <TileLayer
            key={isDark ? "dark" : "light"}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={
              isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            }
          />

          {regions.map((region) => (
            <RegionBubble
              key={region.key}
              region={region}
              maxCount={maxCount}
              isCity={showCityLevel}
              onStateFocus={handleStateFocus}
            />
          ))}
        </MapContainer>

        {regions.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground bg-card/90 border border-border rounded-xl px-4 py-3 shadow-sm">
              No geocoded active complaints to display yet.
            </p>
          </div>
        )}
      </div>

      <MapLegend mode={showCityLevel ? "city" : "state"} focusedState={focusedState} />
    </div>
  );
}

function RegionBubble({ region, maxCount, isCity, onStateFocus }) {
  const map = useMap();
  const fill = getCategoryColor(region.dominantCategory);
  const radius = getBubbleRadius(region.count, maxCount, isCity);
  const fillOpacity = getBubbleOpacity(region.count, maxCount);

  return (
    <CircleMarker
      center={region.center}
      radius={radius}
      pathOptions={{
        color: fill,
        fillColor: fill,
        fillOpacity,
        weight: 2,
        opacity: 0.95,
      }}
      eventHandlers={{
        click: () => {
          if (region.level === "state") {
            onStateFocus(region, map);
          }
        },
      }}
    >
      <Popup>
        <RegionPopupContent region={region} />
        {region.level === "state" && (
          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/60">
            Click the circle to explore cities in this state.
          </p>
        )}
      </Popup>
    </CircleMarker>
  );
}
