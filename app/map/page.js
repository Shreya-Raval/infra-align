"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ComplaintsMap = dynamic(() => import("@/components/ComplaintsMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f4f5",
        borderRadius: 8,
        color: "#666",
      }}
    >
      <p>Loading map...</p>
    </div>
  ),
});

export default function MapPage() {
  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Complaint Map</h1>
        <Link href="/" style={{ fontSize: 14 }}>
          ← Back to Complaint Form
        </Link>
      </div>
      <ComplaintsMap />
    </main>
  );
}
