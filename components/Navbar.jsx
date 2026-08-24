"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuthProfile } from "@/hooks/useAuthProfile";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, userRole } = useAuthProfile();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      setShowSignOutConfirm(false);
      router.push("/");
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      setIsSigningOut(false);
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
    <header className="sticky top-0 z-50 bg-card/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />

        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? "ia-nav-link-active" : "ia-nav-link"}
              >
                {link.label}
              </Link>
            );
          })}

          {currentUser ? (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="ia-nav-link hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className={
                pathname === "/login"
                  ? "ia-nav-link-active"
                  : "ia-btn-secondary px-3.5 py-1.5 text-sm"
              }
            >
              Sign In
            </Link>
          )}

          <div className="pl-1 sm:pl-1.5 border-l border-border ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        message="You will need to sign in again to report issues or view your complaints."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="danger"
        isLoading={isSigningOut}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </header>
  );
}
