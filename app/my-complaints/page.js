"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import ComplaintCard from "@/components/ComplaintCard";
import { IconPlus } from "@/components/Icons";

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

export default function MyComplaintsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("citizen");
  const [authLoading, setAuthLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-side Filter States
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Auth Guard & Role Fetch
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data()?.role || "citizen");
          }
        } catch {
          setUserRole("citizen");
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Real-time user complaints listener
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "complaints"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort in memory by createdAt descending
        data.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });

        setComplaints(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load user complaints:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // In-memory filtering over user complaints
  const filteredComplaints = complaints.filter((c) => {
    if (categoryFilter !== "All Categories") {
      if ((c.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    if (statusFilter !== "All Statuses") {
      if ((c.status || "registered").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  if (authLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
        <div>
          <p className="ia-eyebrow">Your reports</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            My Submitted Complaints
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track status, review categorizations, and withdraw open reports.
          </p>
        </div>

        <Link
          href="/report"
          className="ia-btn-primary px-4 py-2 text-xs sm:text-sm self-start sm:self-auto"
        >
          <IconPlus />
          <span>Submit New Issue</span>
        </Link>
      </div>

      {/* Filter Controls Bar (shown if user has submitted complaints) */}
      {!loading && complaints.length > 0 && (
        <div className="ia-card p-4 sm:p-5 mb-8">
          <div className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-3">
            Filter My Complaints
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category Dropdown */}
            <div>
              <label htmlFor="my-category-filter" className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Category
              </label>
              <select
                id="my-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs sm:text-sm bg-muted dark:bg-slate-900/40 border border-border rounded-xl px-3 py-2 text-foreground/90 focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label htmlFor="my-status-filter" className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Status
              </label>
              <select
                id="my-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs sm:text-sm bg-muted dark:bg-slate-900/40 border border-border rounded-xl px-3 py-2 text-foreground/90 focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Option */}
          {(categoryFilter !== "All Categories" || statusFilter !== "All Statuses") && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>
                Showing <strong>{filteredComplaints.length}</strong> of {complaints.length} report(s)
              </span>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("All Categories");
                  setStatusFilter("All Statuses");
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-accent-soft-foreground font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Complaints Feed */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading your complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        /* Zero Complaints Total Empty State */
        <div className="ia-card p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl mx-auto mb-3 text-muted-foreground">
            📋
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            No complaints submitted yet
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            When you report road, water, electricity, sanitation, or healthcare issues, they will appear here with live tracking.
          </p>
          <Link
            href="/report"
            className="ia-btn-primary px-5 py-2.5"
          >
            Report an Issue Now →
          </Link>
        </div>
      ) : filteredComplaints.length === 0 ? (
        /* Zero Matches on Filter Empty State */
        <div className="p-12 text-center ia-card shadow-sm text-muted-foreground text-sm">
          <p className="font-semibold text-foreground/90 mb-1">No complaints match these filters.</p>
          <p className="text-xs text-muted-foreground mb-4">Try selecting a different category or status.</p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("All Categories");
              setStatusFilter("All Statuses");
            }}
            className="ia-btn-secondary px-4 py-2 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Showing {filteredComplaints.length} report{filteredComplaints.length === 1 ? "" : "s"}
          </div>
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                currentUser={currentUser}
                userRole={userRole}
                allowWithdraw
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
