"use client";

import { useState, useEffect } from "react";
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
  const [report, setReport] = useState(null);
  const [reportMessage, setReportMessage] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/priority-report")
      .then((res) => res.json())
      .then((data) => {
        if (data?.report && data.report.length > 0) {
          setReport(data.report);
          setGeneratedAt(data.generatedAt || null);
        } else if (data?.message) {
          setReportMessage(data.message);
        }
      })
      .catch((err) => {
        console.error("Failed to load cached priority report:", err);
      });
  }, []);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError("");
    setReportMessage("");

    try {
      const res = await fetch("/api/priority-report", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (
          res.status === 429 ||
          data.error === "rate_limit_exceeded"
        ) {
          setError(
            data.message ||
              "AI rate limit or quota exceeded. Please wait a minute and try again."
          );
        } else if (
          res.status === 503 ||
          data.error === "service_unavailable"
        ) {
          setError(
            data.message ||
              "AI service is currently experiencing high traffic. Please try again in a moment."
          );
        } else {
          setError(
            data.message ||
              data.error ||
              "Failed to generate priority report. Please try again."
          );
        }
        return;
      }

      setReport(data.report || []);
      setGeneratedAt(data.generatedAt || new Date().toISOString());
      if (data.message) {
        setReportMessage(data.message);
      }
    } catch (err) {
      console.error("Failed to generate priority report:", err);
      setError(
        "Network error while generating priority report. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasReport = (report && report.length > 0) || Boolean(generatedAt);

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Complaint Map</h1>
          <Link href="/" style={{ fontSize: 14 }}>
            ← Back to Complaint Form
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {generatedAt && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Last generated at {new Date(generatedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {isLoading
              ? "Analyzing..."
              : hasReport
              ? "Regenerate Report"
              : "Generate Priority Report"}
          </button>
        </div>
      </div>

      <ComplaintsMap />
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Hospital data is illustrative, structured after RBI&apos;s Handbook of Statistics on Indian States.
      </p>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 12,
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {reportMessage && (
        <div
          style={{
            marginTop: 24,
            padding: 12,
            backgroundColor: "#fef3c7",
            color: "#92400e",
            borderRadius: 6,
          }}
        >
          {reportMessage}
        </div>
      )}

      {report && report.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Suggested Priority Projects</h2>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {report.map((item) => (
              <div
                key={item.rank || item.title}
                style={{
                  padding: 16,
                  backgroundColor: "#fafafa",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#e0e7ff",
                      color: "#3730a3",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      fontSize: 12,
                    }}
                  >
                    {item.rank}
                  </span>
                  <span style={{ color: "#111827" }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                  {item.reasoning}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <strong>Category:</strong> {item.relatedCategory}
                  </span>
                  {item.affectedArea && (
                    <span>
                      📍 <strong>Area:</strong> {item.affectedArea}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
