"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "default",
}) {
  const cancelRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isLoading, onCancel]);

  if (!open || !mounted) return null;

  const confirmClass =
    variant === "danger"
      ? "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm min-h-[2.75rem] px-5 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
      : "ia-btn-primary min-h-[2.75rem] px-5";

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        disabled={isLoading}
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md ia-card p-6 sm:p-7 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        {variant === "danger" && (
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/30 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <h2 id="confirm-dialog-title" className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 mt-6 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="ia-btn-secondary min-h-[2.75rem] px-5 text-sm w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`${confirmClass} w-full sm:w-auto`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{confirmLabel}</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
