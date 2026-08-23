"use client";

import Link from "next/link";

export default function Logo({ className = "" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center text-xl sm:text-2xl tracking-tight transition-opacity hover:opacity-90 ${className}`}
    >
      <span className="font-semibold text-slate-800 dark:text-slate-100">
        Samasya
      </span>
      <span className="font-black text-civic-600 dark:text-civic-400">
        Setu
      </span>
    </Link>
  );
}
