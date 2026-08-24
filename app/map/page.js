"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { countryConfig } from "@/lib/countryConfig";

const ComplaintsMap = dynamic(() => import("@/components/ComplaintsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[450px] w-full rounded-2xl bg-muted border border-border flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span>Loading Geographic Map...</span>
    </div>
  ),
});

export default function MapPage() {
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [report, setReport] = useState(null);
  const [reportMessage, setReportMessage] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
      })
      .finally(() => {
        setIsInitialLoading(false);
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="ia-eyebrow">Map</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Infrastructure & Complaint Map
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Country Selector */}
          <div className="relative">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl px-4 py-2 pr-9 text-sm font-medium text-foreground shadow-xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              {Object.entries(countryConfig).map(([code, c]) => (
                <option key={code} value={code} className="text-foreground bg-card">
                  {c.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              ▼
            </span>
          </div>

          {/* Last generated timestamp indicator */}
          {generatedAt && (
            <span className="hidden sm:inline-flex text-xs font-medium text-muted-foreground bg-muted px-3 py-2 rounded-xl border border-border">
              Updated: {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* Live Generate Priority Report Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading || isInitialLoading}
            className="ia-btn-primary px-4 sm:px-5 py-2"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{hasReport ? "Regenerate Report" : "Generate Priority Report"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Component */}
      <ComplaintsMap country={selectedCountry} />

      {/* Error alert */}
      {!isLoading && !isInitialLoading && error && (
        <div className="mt-6 p-4 rounded-xl ia-alert-error text-sm font-medium">
          ❌ {error}
        </div>
      )}

      {/* Info message */}
      {!isLoading && !isInitialLoading && reportMessage && (!report || report.length === 0) && (
        <div className="mt-6 p-4 rounded-xl ia-alert-warning text-sm">
          ℹ️ {reportMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {(isLoading || isInitialLoading) && (
        <section className="mt-10 min-h-[320px] space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-52 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="ia-card rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div
                    className="h-5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"
                    style={{ width: `${45 + i * 15}%` }}
                  />
                </div>
                <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse" />
                <div className="flex gap-4 pt-1">
                  <div className="h-4 w-28 bg-muted rounded-md animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Generated Priority Report Display */}
      {!isLoading && !isInitialLoading && report && report.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Suggested Priority Interventions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Synthesized by Gemini from live citizen complaints and regional healthcare capacity
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {report.length} recommendations
            </span>
          </div>

          <div className="space-y-3.5">
            {report.map((item) => (
              <div
                key={item.rank || item.title}
                className="ia-card rounded-xl hover:border-border p-5 transition-colors shadow-xs"
              >
                {/* Header with Rank & Title */}
                <div className="flex items-start gap-3 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-soft text-accent-soft-foreground text-xs font-extrabold border border-accent-soft-border shrink-0">
                    {item.rank}
                  </span>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-foreground/80 text-sm leading-relaxed mb-3 pl-10">
                  {item.reasoning}
                </p>

                {/* Metadata tags */}
                <div className="flex items-center gap-3 pl-10 flex-wrap text-xs text-muted-foreground">
                  <span className="px-2.5 py-1 rounded-md bg-muted border border-border font-medium">
                    Category: <strong className="text-foreground/90">{item.relatedCategory}</strong>
                  </span>
                  {item.affectedArea && (
                    <span className="px-2.5 py-1 rounded-md bg-muted border border-border font-medium">
                      Area: <strong className="text-foreground/90">{item.affectedArea}</strong>
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
