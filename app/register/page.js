"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import LocationFields from "@/components/LocationFields";

export default function RegisterPage() {
  const router = useRouter();
  const locationRef = useRef(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Please enter your first and last name.");
      return;
    }

    const locationError = await locationRef.current?.validateAsync();
    if (locationError) {
      setFormError(locationError);
      return;
    }

    if (!user || !user.uid) {
      setFormError("Authentication session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const existingUserDoc = await getDoc(userDocRef);

      if (existingUserDoc.exists()) {
        router.push("/");
        return;
      }

      await setDoc(userDocRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        email: user.email || "",
        role: "citizen",
        createdAt: serverTimestamp(),
      });

      let redirectPath = "/";
      try {
        const idToken = await user.getIdToken();
        if (idToken) {
          const bootstrapRes = await fetch("/api/bootstrap-superadmin", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          const bootstrapData = await bootstrapRes.json().catch(() => ({}));
          if (bootstrapRes.ok && bootstrapData.role === "superadmin") {
            redirectPath = "/admin/create-manager";
          } else if (!bootstrapRes.ok) {
            console.warn("Superadmin bootstrap skipped:", bootstrapData.error);
          }
        }
      } catch (bootstrapErr) {
        console.error("Superadmin bootstrap error:", bootstrapErr);
      }

      router.push(redirectPath);
    } catch (err) {
      console.error("User profile creation error:", err);
      setFormError(
        err.message || "Failed to save profile. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-8">
        <p className="ia-eyebrow">Account setup</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Complete Your Registration
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Add your name and location so reports can be linked to the right area.
        </p>
      </div>

      <div className="ia-card p-6 sm:p-8">
        {user && (
          <div className="mb-6 p-3.5 rounded-xl bg-muted dark:bg-slate-900/40 border border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Signed in as: <strong className="text-foreground/90">{user.email}</strong>
            </span>
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Verified</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first-name" className="block text-xs font-semibold text-foreground/80 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Aarav"
                disabled={isSubmitting}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label htmlFor="last-name" className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                disabled={isSubmitting}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <LocationFields
            ref={locationRef}
            idPrefix="register"
            pincode={pincode}
            city={city}
            state={state}
            onPincodeChange={setPincode}
            onCityChange={setCity}
            onStateChange={setState}
            disabled={isSubmitting}
            pincodeHint="Auto-detects city & state"
          />

          {formError && (
            <div className="p-3.5 rounded-xl ia-alert-error text-xs sm:text-sm font-medium">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="ia-btn-primary w-full py-3"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              "Complete Registration & Continue"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
