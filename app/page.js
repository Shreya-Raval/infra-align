"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

export default function Home() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Device location not available:", error.message);
      }
    );
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !location.trim()) {
      setError("Please enter both a complaint and a location.");
      return;
    }
    if (!text.trim()) {
      setError("Please describe your complaint.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter the area this complaint is about.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tag-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Complaint text is too short.");
        return;
      }

      if (!data.isActionable) {
        setError(
          "This doesn't appear to be a valid complaint. Please provide more detail about the issue."
        );
        return;
      }

      const docRef = await addDoc(collection(db, "complaints"), {
        text: text,
        location: location,
        deviceLocation: deviceLocation, // null if unavailable
        createdAt: serverTimestamp(),
        category: data.category,
        urgency: data.urgency,
        summary: data.summary,
      });

      setText("");
      setLocation("");

      fetch("/api/geocode-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: docRef.id, location }),
      }).catch((err) => console.error("Geocoding request failed:", err));
    } catch (err) {
      console.error("Submission error:", err);
      setError("Something went wrong while submitting your complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>Civic Complaint Portal</h1>
      <p style={{ margin: "8px 0 16px" }}>
        <Link href="/map">View Complaints Map →</Link>
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your complaint..."
          rows={4}
          style={{ width: "100%", padding: 8 }}
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Area (e.g. Andheri West, Mumbai)"
          style={{ width: "100%", padding: 8, marginTop: 8 }}
        />
        <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          We use your device location in the background to help verify reports.
        </p>
        {error && (
          <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{error}</p>
        )}
        <button type="submit" disabled={isSubmitting} style={{ marginTop: 8 }}>
          {isSubmitting ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>

      <h2 style={{ marginTop: 32 }}>Submitted Complaints</h2>
      <ul>
        {complaints.map((c) => (
          <li key={c.id} style={{ marginBottom: 8 }}>
            <strong>{c.text}</strong>
            <br />
            <span style={{ fontSize: 13, color: "#555" }}>📍 {c.location}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}