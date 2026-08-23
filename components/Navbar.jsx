"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data()?.role || "citizen");
          } else {
            setUserRole("citizen");
          }
        } catch {
          setUserRole("citizen");
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/feed", label: "Public Feed" },
    { href: "/report", label: "Report Issue" },
    ...(currentUser ? [{ href: "/my-complaints", label: "My Complaints" }] : []),
    ...(userRole === "superadmin"
      ? [{ href: "/admin/create-manager", label: "Create Manager" }]
      : []),
    { href: "/map", label: "Map & Priority Insights" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              Infra<span className="text-indigo-600">Align</span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">
              Civic Intelligence
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {currentUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === "/login"
                  ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
