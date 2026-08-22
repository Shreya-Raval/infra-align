"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  );
}

export default function ComplaintCard({ complaint, currentUser, userRole }) {
  const c = complaint;
  const isOwner = currentUser && c.userId && currentUser.uid === c.userId;
  const isManagerOrAdmin = userRole === "manager" || userRole === "superadmin";

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  const canWithdraw =
    isOwner &&
    (c.status || "registered").toLowerCase() !== "closed" &&
    (c.status || "registered").toLowerCase() !== "withdrawn";

  const handleWithdraw = async () => {
    const confirmed = window.confirm(
      "Withdraw this complaint? It will no longer be publicly visible by default."
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "complaints", c.id), {
        status: "withdrawn",
      });
    } catch (err) {
      console.error("Failed to withdraw complaint:", err);
      alert("Failed to withdraw complaint. Please try again.");
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === c.status) return;

    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setStatusError("Authentication required.");
        return;
      }

      const res = await fetch("/api/update-complaint-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          complaintId: c.id,
          newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || "Failed to update status.");
      } else {
        setStatusMessage(`Status updated to "${newStatus}"`);
        setTimeout(() => setStatusMessage(""), 3500);
      }
    } catch (err) {
      console.error("Status update error:", err);
      setStatusError("Network error updating status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 transition-colors shadow-xs">
      {/* Meta Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {c.category && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {c.category}
            </span>
          )}
          {c.urgency !== undefined && c.urgency !== null && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                c.urgency >= 4
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : c.urgency === 3
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              Urgency: {c.urgency}/5
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={c.status} />

          {/* Manager / Superadmin Status Changer */}
          {isManagerOrAdmin && (c.status || "registered").toLowerCase() !== "withdrawn" && (
            <div className="flex items-center gap-1.5">
              <label htmlFor={`status-select-${c.id}`} className="sr-only">
                Change Status
              </label>
              <select
                id={`status-select-${c.id}`}
                value={(c.status || "registered").toLowerCase()}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
              >
                <option value="registered">Registered</option>
                <option value="in progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
              {isUpdatingStatus && (
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}

          {/* Citizen Owner Withdraw Button */}
          {canWithdraw && (
            <button
              type="button"
              onClick={handleWithdraw}
              className="px-2 py-0.5 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Withdraw complaint"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Card Feedback for Status Update */}
      {statusMessage && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md mb-2 font-medium">
          ✓ {statusMessage}
        </div>
      )}
      {statusError && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md mb-2 font-medium">
          ⚠️ {statusError}
        </div>
      )}

      {/* Complaint Text */}
      <p className="text-slate-900 font-medium text-sm sm:text-base leading-relaxed mb-2.5">
        {c.text}
      </p>

      {/* AI Summary / Translation if present */}
      {c.summary && c.summary !== c.text && (
        <p className="text-xs text-slate-500 italic mb-2.5">
          💡 AI Summary: &ldquo;{c.summary}&rdquo;
        </p>
      )}

      {/* Public Attribution Display */}
      {c.statusChangedByName && (
        <div className="text-xs text-indigo-800 bg-indigo-50/70 border border-indigo-100/80 px-2.5 py-1.5 rounded-lg mb-2.5 flex items-center gap-1.5">
          <span>🏛️</span>
          <span>
            Status last updated by <strong className="font-semibold text-indigo-900">{c.statusChangedByName}</strong>
            {c.statusChangedByState ? `, ${c.statusChangedByState}` : ""}
          </span>
        </div>
      )}

      {/* Duplicate Flag Badge — visible only to owner */}
      {isOwner && c.isDuplicateFlag && (
        <div className="my-2.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Possible duplicate — you have another open complaint in this category/area.</span>
        </div>
      )}

      {/* Location & Submitter Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 font-medium text-slate-600">
          📍 {c.location}
        </span>
        <div className="flex items-center gap-3">
          {c.isAnonymous === true ? (
            <span className="text-slate-500 italic">Anonymous</span>
          ) : c.isAnonymous === false && c.submitterName ? (
            <span className="text-slate-600 font-medium">Reported by {c.submitterName}</span>
          ) : null}
          {c.createdAt?.toDate && (
            <span>{c.createdAt.toDate().toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Attached Image Gallery */}
      {c.imageUrls && c.imageUrls.length > 0 && (
        <div className="flex gap-2.5 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          {c.imageUrls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={idx}
              src={url}
              alt={`Attachment ${idx + 1}`}
              className="w-14 h-14 rounded-lg object-cover border border-slate-200 hover:scale-105 transition-transform"
            />
          ))}
        </div>
      )}
    </div>
  );
}
