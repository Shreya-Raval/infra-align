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

export default function LoginPage() {
  const router = useRouter();
  const hasAttemptedSignIn = useRef(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
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
    try {
      await signOut(auth);
      setMessage("You have signed out successfully.");
      setError("");
    } catch (err) {
      console.error("Sign out error:", err);
      setError("Failed to sign out. Please try again.");
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Auth Active Banner */}
      {user && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-900">Signed In</div>
              <div className="text-xs text-emerald-700 font-medium truncate max-w-[180px] sm:max-w-[220px]">
                {user.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Signing In Status Alert */}
      {isSigningIn && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2.5 shadow-xs">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Verifying sign-in link, please wait...</span>
        </div>
      )}

      {/* Re-enter Email Prompt if opened on another device/browser */}
      {needsEmailConfirmation && (
        <form
          onSubmit={handleCompleteSignInWithEnteredEmail}
          className="mb-6 p-6 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-amber-900">
              Confirm your Email Address
            </h2>
            <p className="text-xs text-amber-800 mt-1">
              You opened this sign-in link in a new browser. Please re-enter your email to complete verification:
            </p>
          </div>

          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isSigningIn}
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-sm transition-all disabled:opacity-50"
          >
            {isSigningIn ? "Verifying..." : "Confirm & Sign In"}
          </button>
        </form>
      )}

      {/* Main Authentication Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto mb-3">
            ✉️
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Passwordless Sign In
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Enter your email to receive a secure, one-click magic sign-in link.
          </p>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isSending}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending Link...</span>
              </>
            ) : (
              "Send Sign-In Link"
            )}
          </button>
        </form>

        {/* Feedback Messages */}
        {message && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium">
            ❌ {error}
          </div>
        )}
      </div>
    </main>
  );
}
