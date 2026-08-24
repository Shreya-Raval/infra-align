"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ImageLightbox({ open, src, alt, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        aria-label="Close image preview"
        onClick={onClose}
      />

      <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="relative z-10 ia-btn-secondary px-3 py-1.5 text-xs"
        >
          Close
        </button>

        <div className="relative w-full flex items-center justify-center max-h-[calc(90vh-3rem)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || "Attachment preview"}
            className="relative max-w-full max-h-[calc(90vh-3rem)] w-auto h-auto rounded-xl border border-border shadow-2xl object-contain bg-card"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
