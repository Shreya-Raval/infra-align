"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

export default function ComplaintsMap() {
  const [complaints, setComplaints] = useState([]);

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
