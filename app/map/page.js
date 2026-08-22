"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { countryConfig } from "@/lib/countryConfig";

const ComplaintsMap = dynamic(() => import("@/components/ComplaintsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[450px] w-full rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-1.5">
            Geographic Spatial Analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
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
              className="appearance-none bg-white border border-slate-300 rounded-xl px-4 py-2 pr-9 text-sm font-medium text-slate-900 shadow-xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              {Object.entries(countryConfig).map(([code, c]) => (
                <option key={code} value={code} className="text-slate-900 bg-white">
                  🌐 {c.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </span>
          </div>

          {/* Last generated timestamp indicator */}
          {generatedAt && (
            <span className="hidden sm:inline-flex text-xs font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
              Updated: {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* Live Generate Priority Report Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading || isInitialLoading}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          ❌ {error}
        </div>
      )}

      {/* Info message */}
      {!isLoading && !isInitialLoading && reportMessage && (!report || report.length === 0) && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ℹ️ {reportMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {(isLoading || isInitialLoading) && (
        <section className="mt-10 min-h-[320px] space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-52 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 rounded-md animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse" />
                  <div
                    className="h-5 bg-slate-200 rounded-md animate-pulse"
                    style={{ width: `${45 + i * 15}%` }}
                  />
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-md animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-100 rounded-md animate-pulse" />
                <div className="flex gap-4 pt-1">
                  <div className="h-4 w-28 bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Generated Priority Report Display */}
      {!isLoading && !isInitialLoading && report && report.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Suggested Priority Interventions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Synthesized by Gemini from live citizen complaints and regional healthcare capacity
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {report.length} Recommendations
            </span>
          </div>

          <div className="space-y-3.5">
            {report.map((item) => (
              <div
                key={item.rank || item.title}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 transition-colors shadow-xs"
              >
                {/* Header with Rank & Title */}
                <div className="flex items-start gap-3 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-200 shrink-0">
                    {item.rank}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-slate-700 text-sm leading-relaxed mb-3 pl-10">
                  {item.reasoning}
                </p>

                {/* Metadata tags */}
                <div className="flex items-center gap-3 pl-10 flex-wrap text-xs text-slate-600">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium">
                    Category: <strong className="text-slate-800">{item.relatedCategory}</strong>
                  </span>
                  {item.affectedArea && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-medium">
                      📍 Area: <strong className="text-slate-800">{item.affectedArea}</strong>
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
