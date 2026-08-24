"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getStatusBadgeClass } from "@/lib/uiTheme";
import ImageLightbox from "@/components/ImageLightbox";

function StatusBadge({ status }) {
  const currentStatus = (status || "registered").toLowerCase();
  const labels = {
    registered: "Registered",
    "in progress": "In Progress",
    closed: "Closed",
    withdrawn: "Withdrawn",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(currentStatus)}`}
    >
      {labels[currentStatus] || labels.registered}
    </span>
  );
}

export default function ComplaintCard({
  complaint,
  currentUser,
  userRole,
  allowWithdraw = false,
}) {
  const c = complaint;
  const isOwner = currentUser && c.userId && currentUser.uid === c.userId;
  const isManagerOrAdmin = userRole === "manager" || userRole === "superadmin";

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);

  const canWithdraw =
    allowWithdraw &&
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
    <div className="ia-card rounded-xl hover:border-slate-300 dark:hover:border-slate-600 p-5 transition-colors shadow-xs dark:shadow-none">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {c.category && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-accent-soft text-accent-soft-foreground border border-accent-soft-border">
              {c.category}
            </span>
          )}
          {c.urgency !== undefined && c.urgency !== null && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                c.urgency >= 4
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                  : c.urgency === 3
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600"
              }`}
            >
              Urgency: {c.urgency}/5
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={c.status} />

          {isManagerOrAdmin &&
            (c.status || "registered").toLowerCase() !== "withdrawn" && (
              <div className="flex items-center gap-1.5">
                <label htmlFor={`status-select-${c.id}`} className="sr-only">
                  Change Status
                </label>
                <select
                  id={`status-select-${c.id}`}
                  value={(c.status || "registered").toLowerCase()}
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="text-xs font-medium bg-muted border border-border rounded-md px-2 py-1 text-foreground hover:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 dark:bg-slate-900/60"
                >
                  <option value="registered">Registered</option>
                  <option value="in progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
                {isUpdatingStatus && (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}

        </div>
      </div>

      {statusMessage && (
        <div className="text-xs ia-alert-success px-2 py-1 mb-2 font-medium">
          {statusMessage}
        </div>
      )}
      {statusError && (
        <div className="text-xs ia-alert-error px-2 py-1 mb-2 font-medium">
          {statusError}
        </div>
      )}

      <p className="text-foreground font-medium text-sm sm:text-base leading-relaxed mb-2.5">
        {c.text}
      </p>

      {c.summary && c.summary !== c.text && (
        <p className="text-xs text-muted-foreground italic mb-2.5">
          Summary: &ldquo;{c.summary}&rdquo;
        </p>
      )}

      {c.statusChangedByName && (
        <div className="text-xs text-accent-soft-foreground bg-accent-soft border border-accent-soft-border px-2.5 py-1.5 rounded-lg mb-2.5">
          Status last updated by{" "}
          <strong className="font-semibold">{c.statusChangedByName}</strong>
          {c.statusChangedByState ? `, ${c.statusChangedByState}` : ""}
        </div>
      )}

      {isOwner && c.isDuplicateFlag && (
        <div className="my-2.5 px-3 py-1.5 ia-alert-warning text-xs font-medium">
          Possible duplicate — you have another open complaint in this
          category/area.
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-2 border-t border-border/60">
        <span className="flex items-center gap-1 font-medium text-foreground/70">
          {c.location}
        </span>
        <div className="flex items-center gap-3">
          {c.isAnonymous === true ? (
            <span className="italic">Anonymous</span>
          ) : c.isAnonymous === false && c.submitterName ? (
            <span className="font-medium text-foreground/70">
              Reported by {c.submitterName}
            </span>
          ) : null}
          {c.createdAt?.toDate && (
            <span>{c.createdAt.toDate().toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {canWithdraw && (
        <div className="flex justify-end pt-3 mt-1">
          <button
            type="button"
            onClick={handleWithdraw}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-xs sm:text-sm min-h-[2.25rem] px-4 py-2 text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:bg-slate-900/40 dark:border-rose-500/30 dark:hover:bg-rose-500/10 transition-colors cursor-pointer shadow-xs"
          >
            Withdraw complaint
          </button>
        </div>
      )}

      {c.imageUrls && c.imageUrls.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Attachments ({c.imageUrls.length})
          </p>
          <div className="flex gap-3 flex-wrap">
            {c.imageUrls.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxImage({ src: url, alt: `Attachment ${idx + 1}` })}
                className="group relative shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-xl border border-border bg-muted/30 overflow-hidden hover:border-indigo-400 dark:hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
                title="Click to view full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-full object-contain bg-slate-100 dark:bg-slate-900/60"
                />
                <span className="absolute inset-x-0 bottom-0 py-1 text-[10px] font-medium text-white bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                  View full size
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ImageLightbox
        open={Boolean(lightboxImage)}
        src={lightboxImage?.src}
        alt={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
