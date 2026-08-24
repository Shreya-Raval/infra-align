"use client";

import Link from "next/link";

export default function Logo({ className = "" }) {
  return (
    <Link
      href="/"
      aria-label="InfraAlign home"
      className={`group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
    >
      <span
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm ring-1 ring-indigo-600/20 transition-transform duration-200 group-hover:scale-[1.03] dark:from-indigo-400 dark:to-indigo-600 dark:ring-indigo-300/20"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-white"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 18V11.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M12 18V7"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M19 18V13"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M4.5 18.5h15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </span>

      <span className="text-xl sm:text-[1.35rem] font-semibold tracking-tight leading-none">
        <span className="text-slate-900 dark:text-slate-50">Infra</span>
        <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-300 dark:to-indigo-400">
          Align
        </span>
      </span>
    </Link>
  );
}
