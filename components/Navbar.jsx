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
import { User, LogOut } from "lucide-react";

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
    { href: "/feed", label: "Feed" },
    { href: "/report", label: "Report" },
    ...(currentUser ? [{ href: "/my-complaints", label: "Complaints" }] : []),
    ...(userRole === "superadmin"
      ? [{ href: "/admin/create-manager", label: "Add Manager" }]
      : []),
    { href: "/map", label: "Insights Map" },
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

          {!currentUser && (
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

          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-border ml-1">
            {currentUser && (
              <Link
                href="/profile"
                title={`Logged in as: ${currentUser.email || currentUser.displayName || "User"}`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer shrink-0 ${pathname === "/profile" ? "ring-2 ring-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : ""}`}
              >
                <User className="w-4 h-4" />
              </Link>
            )}

            <ThemeToggle />

            {currentUser && (
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                title="Sign Out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-muted hover:bg-muted/80 hover:text-rose-600 dark:hover:text-rose-400 text-foreground transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
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
