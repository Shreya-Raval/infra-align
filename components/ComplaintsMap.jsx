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
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: typeof iconRetinaUrl === "string" ? iconRetinaUrl : iconRetinaUrl.src,
  iconUrl: typeof iconUrl === "string" ? iconUrl : iconUrl.src,
  shadowUrl: typeof shadowUrl === "string" ? shadowUrl : shadowUrl.src,
});

function getHospitalRadius(count) {
  const minR = 6;
  const maxR = 30;
  const minSqrt = Math.sqrt(50);
  const maxSqrt = Math.sqrt(4500);
  const countSqrt = Math.sqrt(Math.max(count || 0, 50));
  return minR + ((countSqrt - minSqrt) / (maxSqrt - minSqrt)) * (maxR - minR);
}

export default function ComplaintsMap() {
  const [complaints, setComplaints] = useState([]);
  const [hospitals, setHospitals] = useState([]);

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
    <div style={{ height: "80vh", width: "100%", borderRadius: 8, overflow: "hidden" }}>
      <MapContainer
        center={[22.9734, 78.6569]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
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
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                      <strong>{h.state}</strong> — {h.govt_hospitals_total?.toLocaleString()} government hospitals
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

          return (
            <Marker key={c.id} position={[c.lat, c.lng]}>
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {c.location && (
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                      📍 {c.location}
                    </div>
                  )}
                  {truncatedText && (
                    <div style={{ marginBottom: 6, color: "#333" }}>
                      {truncatedText}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {c.category ? (
                      <div>
                        <span>
                          <strong>Category:</strong> {c.category}
                        </span>
                        {c.urgency !== undefined && c.urgency !== null && (
                          <span> (Urgency: {c.urgency}/5)</span>
                        )}
                      </div>
                    ) : (
                      <em>Tagging...</em>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
