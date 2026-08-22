"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import ComplaintCard from "@/components/ComplaintCard";

const CATEGORY_OPTIONS = [
  "All Categories",
  "Roads",
  "Water Supply",
  "Electricity",
  "Sanitation/Health",
  "Education",
  "Other",
];

const STATUS_OPTIONS = [
  "All Statuses",
  "Registered",
  "In Progress",
  "Closed",
  "Withdrawn",
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-side Filter States
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Track auth state & role for manager controls
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (err) {
          console.error("Failed to load user profile on home page:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time public complaints stream
  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setComplaints(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch complaints stream:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Client-side filtering over complaints
  const filteredComplaints = complaints.filter((c) => {
    // 1. Category Filter
    if (categoryFilter !== "All Categories") {
      if ((c.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Status Filter
    const compStatus = (c.status || "registered").toLowerCase();
    if (statusFilter !== "All Statuses") {
      if (compStatus !== statusFilter.toLowerCase()) {
        return false;
      }
    } else {
      // By default when "All Statuses" is selected, exclude withdrawn unless explicitly chosen
      if (compStatus === "withdrawn") {
        return false;
      }
    }

    // 3. State / Location Filter
    if (stateFilter.trim()) {
      const term = stateFilter.trim().toLowerCase();
      const locationMatch = (c.location || "").toLowerCase().includes(term);
      const stateAttributionMatch = (c.statusChangedByState || "")
        .toLowerCase()
        .includes(term);
      if (!locationMatch && !stateAttributionMatch) {
        return false;
      }
    }

    return true;
  });

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            Public Civic Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Civic Issues & Resolution Feed
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-xl">
            Real-time stream of citizen-reported infrastructure issues across roads, water, electricity, sanitation, and health.
          </p>
        </div>

        <Link
          href="/report"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-sm hover:shadow transition-all shrink-0"
        >
          <span>＋</span>
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-8">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Filter Complaints
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Dropdown */}
          <div>
            <label htmlFor="category-filter" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* State / Location Text Input */}
          <div>
            <label htmlFor="state-filter" className="block text-[11px] font-semibold text-slate-600 mb-1">
              State / City / Area
            </label>
            <input
              id="state-filter"
              type="text"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              placeholder="e.g. Maharashtra, Mumbai"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <label htmlFor="status-filter" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary / Reset */}
        {(categoryFilter !== "All Categories" ||
          stateFilter.trim() !== "" ||
          statusFilter !== "All Statuses") && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredComplaints.length}</strong> matching report(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("All Categories");
                setStateFilter("");
                setStatusFilter("All Statuses");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Complaints Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 className="text-lg font-bold text-slate-900">
            Public Reports ({filteredComplaints.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading live complaints...
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No complaints found matching current filter criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                currentUser={currentUser}
                userRole={userProfile?.role || "citizen"}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}