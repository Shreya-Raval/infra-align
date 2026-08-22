"use client";

import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  LayersControl,
  LayerGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { countryConfig } from "@/lib/countryConfig";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: typeof iconRetinaUrl === "string" ? iconRetinaUrl : iconRetinaUrl.src,
  iconUrl: typeof iconUrl === "string" ? iconUrl : iconUrl.src,
  shadowUrl: typeof shadowUrl === "string" ? shadowUrl : shadowUrl.src,
});

function StatusBadge({ status }) {
  const currentStatus = (status || "registered").toLowerCase();

  const statusConfig = {
    registered: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-200",
      label: "Registered",
    },
    "in progress": {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      label: "In Progress",
    },
    closed: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      label: "Closed",
    },
    withdrawn: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      border: "border-rose-200",
      label: "Withdrawn",
    },
  };

  const current = statusConfig[currentStatus] || statusConfig.registered;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  );
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") {
      return () => clearTimeout(timer);
    }

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    observer.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function MapViewController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

function getHospitalRadius(count) {
  const minR = 6;
  const maxR = 30;
  const minSqrt = Math.sqrt(50);
  const maxSqrt = Math.sqrt(4500);
  const countSqrt = Math.sqrt(Math.max(count || 0, 50));
  return minR + ((countSqrt - minSqrt) / (maxSqrt - minSqrt)) * (maxR - minR);
}

export default function ComplaintsMap({ country = "IN" }) {
  const config = countryConfig[country] || countryConfig.IN;
  const [currentUser, setCurrentUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComplaints(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/data/govt_hospitals_by_state.csv")
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const validData = (results.data || []).filter(
              (row) =>
                row.state &&
                typeof row.lat === "number" &&
                typeof row.lng === "number" &&
                typeof row.govt_hospitals_total === "number"
            );
            setHospitals(validData);
          },
          error: (err) => {
            console.error("Error parsing hospital CSV:", err);
          },
        });
      })
      .catch((err) => {
        console.error("Error fetching hospital CSV:", err);
      });
  }, []);

  const validComplaints = complaints.filter(
    (c) =>
      typeof c.lat === "number" &&
      typeof c.lng === "number" &&
      !isNaN(c.lat) &&
      !isNaN(c.lng)
  );

  return (
    <div>
      <div className="h-[70vh] min-h-[450px] w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative bg-slate-100">
        <MapContainer
          center={config.mapCenter}
          zoom={config.mapZoom}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <MapResizeHandler />
          <MapViewController center={config.mapCenter} zoom={config.mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <LayersControl position="topright">
            <LayersControl.Overlay checked name="Government Hospitals">
              <LayerGroup>
                {hospitals.map((h) => (
                  <CircleMarker
                    key={h.state}
                    center={[h.lat, h.lng]}
                    radius={getHospitalRadius(h.govt_hospitals_total)}
                    pathOptions={{
                      color: "#ea580c",
                      fillColor: "#f97316",
                      fillOpacity: 0.35,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="text-xs leading-relaxed">
                        <strong className="font-semibold text-slate-900">{h.state}</strong> —{" "}
                        <span className="text-orange-700 font-medium">
                          {h.govt_hospitals_total?.toLocaleString()} government hospitals
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>

          {validComplaints.map((c) => {
            const truncatedText =
              c.text && c.text.length > 100
                ? `${c.text.slice(0, 100)}...`
                : c.text;

            const isOwner =
              currentUser &&
              c.userId &&
              currentUser.uid === c.userId;

            return (
              <Marker key={c.id} position={[c.lat, c.lng]}>
                <Popup>
                  <div className="text-xs leading-relaxed space-y-1.5 min-w-[180px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                      {c.location ? (
                        <div className="font-bold text-slate-900 text-xs">
                          📍 {c.location}
                        </div>
                      ) : <div />}
                      <StatusBadge status={c.status} />
                    </div>

                    {truncatedText && (
                      <div className="text-slate-800 text-xs font-normal">
                        {truncatedText}
                      </div>
                    )}

                    {/* Submitter and Category row */}
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {c.category ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-indigo-700">{c.category}</span>
                          {c.urgency !== undefined && c.urgency !== null && (
                            <span className="text-slate-600 font-medium">(Urgency: {c.urgency}/5)</span>
                          )}
                        </div>
                      ) : (
                        <em className="text-slate-400">Tagging...</em>
                      )}

                      {/* Submitter info */}
                      {c.isAnonymous === true ? (
                        <span className="italic text-slate-500">Anonymous</span>
                      ) : c.isAnonymous === false && c.submitterName ? (
                        <span className="text-slate-600 font-medium">Reported by {c.submitterName}</span>
                      ) : null}
                    </div>

                    {/* Duplicate Flag Note — visible only to owner */}
                    {isOwner && c.isDuplicateFlag && (
                      <div className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded mt-1">
                        ⚠️ Possible duplicate — you have another open complaint in this category/area.
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2.5 px-1">
        <span>🏥</span>
        <span>{config.infraLabel}</span>
      </div>
    </div>
  );
}
