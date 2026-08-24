"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { IconMail } from "@/components/Icons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function LoginPage() {
  const router = useRouter();
  const hasAttemptedSignIn = useRef(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const checkUserProfileAndRedirect = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        router.push("/");
      } else {
        router.push("/register");
      }
    } catch (err) {
      console.error("User profile check error:", err);
      router.push("/");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Check if the page was opened from an email sign-in link
    if (typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
      const emailForSignIn = window.localStorage.getItem("emailForSignIn");

      if (emailForSignIn) {
        if (!hasAttemptedSignIn.current) {
          hasAttemptedSignIn.current = true;
          setIsSigningIn(true);
          signInWithEmailLink(auth, emailForSignIn, window.location.href)
            .then(async (result) => {
              window.localStorage.removeItem("emailForSignIn");
              setMessage(`Signed in successfully as ${result.user?.email || emailForSignIn}`);
              if (result.user?.uid) {
                await checkUserProfileAndRedirect(result.user.uid);
              }
            })
            .catch((err) => {
              console.error("Sign-in with link error:", err);
              setError(
                "The sign-in link is invalid or has expired. Please request a new link below."
              );
            })
            .finally(() => {
              setIsSigningIn(false);
            });
        }
      } else {
        // Link opened in a different browser/device where localStorage is not available
        setNeedsEmailConfirmation(true);
      }
    }

    return () => unsubscribe();
  }, []);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsSending(true);

    try {
      const actionCodeSettings = {
        url: window.location.origin + "/login",
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email.trim());
      setMessage("Check your email for a secure sign-in link.");
    } catch (err) {
      console.error("Send sign-in link error:", err);
      setError(
        err.message || "Failed to send sign-in link. Please check your email and try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteSignInWithEnteredEmail = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!confirmEmail || !confirmEmail.trim()) {
      setError("Please confirm the email address you used to request the sign-in link.");
      return;
    }

    setIsSigningIn(true);

    try {
      const result = await signInWithEmailLink(
        auth,
        confirmEmail.trim(),
        window.location.href
      );
      window.localStorage.removeItem("emailForSignIn");
      setNeedsEmailConfirmation(false);
      setMessage(`Signed in successfully as ${result.user?.email || confirmEmail.trim()}`);
      if (result.user?.uid) {
        await checkUserProfileAndRedirect(result.user.uid);
      }
    } catch (err) {
      console.error("Confirm sign-in link error:", err);
      setError(
        "The sign-in link is invalid, expired, or the email address does not match. Please request a new link below."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      setShowSignOutConfirm(false);
      setMessage("You have signed out successfully.");
      setError("");
    } catch (err) {
      console.error("Sign out error:", err);
      setError("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Auth Active Banner */}
      {user && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/30 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-sm font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Signed In</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[180px] sm:max-w-[220px]">
                {user.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="ia-btn-secondary px-3 py-1.5 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Signing In Status Alert */}
      {isSigningIn && (
        <div className="mb-6 p-4 rounded-2xl ia-alert-info text-sm flex items-center gap-2.5 shadow-xs">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Verifying sign-in link, please wait...</span>
        </div>
      )}

      {/* Re-enter Email Prompt if opened on another device/browser */}
      {needsEmailConfirmation && (
        <form
          onSubmit={handleCompleteSignInWithEnteredEmail}
          className="mb-6 p-6 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 shadow-xs space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-amber-900 dark:text-amber-200">
              Confirm your Email Address
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              You opened this sign-in link in a new browser. Please re-enter your email to complete verification:
            </p>
          </div>

          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isSigningIn}
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />

          <button
            type="submit"
            disabled={isSigningIn}
            className="ia-btn-primary w-full py-2.5"
          >
            {isSigningIn ? "Verifying..." : "Confirm & Sign In"}
          </button>
        </form>
      )}

      {/* Main Authentication Card */}
      <div className="ia-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto mb-3">
            <IconMail />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Sign in
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            Enter your email to receive a one-click sign-in link.
          </p>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-foreground/80 mb-1.5">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isSending}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="ia-btn-primary w-full py-3"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                <span>Sending link...</span>
              </>
            ) : (
              "Send sign-in link"
            )}
          </button>
        </form>

        {/* Feedback Messages */}
        {message && (
          <div className="mt-4 p-3.5 rounded-xl ia-alert-success text-xs sm:text-sm font-medium">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl ia-alert-error text-xs sm:text-sm font-medium">
            ❌ {error}
          </div>
        )}
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
    </main>
  );
}
