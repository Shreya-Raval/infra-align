"use client";

import { useState, useEffect } from "react";
import { Mail, Copy, Check, ExternalLink, X, MapPin, User, AlertCircle } from "lucide-react";

export default function ContactCreatorModal({
  open,
  onClose,
  complaint,
  currentUser,
}) {
  const [loading, setLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [error, setError] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  useEffect(() => {
    if (!open || !complaint) return;

    let isMounted = true;

    async function fetchCreator() {
      try {
        const idToken = await currentUser?.getIdToken();
        if (!idToken) {
          if (isMounted) {
            setError("Authentication required.");
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/get-creator-contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            userId: complaint.userId,
            complaintId: complaint.id,
          }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || "Could not retrieve creator contact details.");
        } else {
          setCreatorInfo(data.creator);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch creator contact:", err);
          setError("Network error retrieving creator contact.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCreator();

    return () => {
      isMounted = false;
    };
  }, [open, complaint, currentUser]);

  if (!open || !complaint) return null;

  const c = complaint;
  const locationText = [c.location, c.city, c.state].filter(Boolean).join(", ");
  const locationWithPin = locationText + (c.pincode ? ` (PIN: ${c.pincode})` : "");

  const emailSubject = `Regarding your InfraAlign report #${c.id.slice(0, 8)}: ${c.category || "Civic Issue"}`;
  const emailBody = `Hello ${creatorInfo?.name || c.submitterName || "Citizen"},

We are contacting you from the InfraAlign municipal administrative team regarding your civic complaint:

Ticket ID: #${c.id}
Category: ${c.category || "General"}
Location: ${locationWithPin || "Specified in report"}
Summary: "${c.summary || c.text || ""}"
Status: ${c.status || "Registered"}

Please reply directly to this email if you have any additional updates, photos, or queries regarding the status of this issue.

Sincerely,
InfraAlign Municipal Administration`;

  const mailtoUrl = creatorInfo?.email
    ? `mailto:${encodeURIComponent(creatorInfo.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : "";

  const handleCopyEmail = async () => {
    if (!creatorInfo?.email) return;
    try {
      await navigator.clipboard.writeText(creatorInfo.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const handleClose = () => {
    setCreatorInfo(null);
    setError("");
    setLoading(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-creator-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 id="contact-creator-title" className="text-base font-semibold text-foreground">
                Email Ticket Creator
              </h2>
              <p className="text-xs text-muted-foreground">
                Direct municipal communication for ticket #{c.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Ticket Context Mini-Card */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate max-w-[280px]">
                {c.summary || c.text}
              </span>
              {c.category && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent-soft text-accent-soft-foreground border border-accent-soft-border">
                  {c.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-muted-foreground text-[11px] flex-wrap">
              <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>{locationWithPin || "Location not specified"}</span>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] pt-1 border-t border-border/50">
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>
                {c.isAnonymous
                  ? "Reported Anonymously (User account on record)"
                  : c.submitterName
                  ? `Reported by ${c.submitterName}`
                  : "Citizen Report"}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">
                Looking up verified creator contact details...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-3.5 rounded-xl ia-alert-error flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch creator email</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Creator Information & Email Actions */}
          {!loading && creatorInfo && (
            <div className="space-y-4">
              {/* Recipient Details Box */}
              <div className="p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-500/20 dark:bg-indigo-500/10 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ticket Creator
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {creatorInfo.name}
                    </h3>
                  </div>
                  {creatorInfo.city && (
                    <span className="text-[11px] text-muted-foreground">
                      {creatorInfo.city}, {creatorInfo.state} {creatorInfo.pincode ? `(${creatorInfo.pincode})` : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-mono font-medium text-foreground select-all truncate">
                      {creatorInfo.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer shrink-0"
                    title="Copy email address"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Message Preview Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground/80">Message Preview</span>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTemplate ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Template copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy template</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/40 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                  <span className="text-foreground font-semibold">Subject: {emailSubject}</span>
                  {"\n\n"}
                  {emailBody}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Close
          </button>

          {creatorInfo?.email && (
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Open in Email App</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
