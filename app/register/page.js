"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function RegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // States
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Guard: check auth status on mount
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

  // Handle Pincode Auto-lookup when 6 digits are entered
  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(value);
    setPincodeError("");

    if (value.length === 6) {
      lookupPincode(value);
    }
  };

  const lookupPincode = async (code) => {
    setIsLookingUpPincode(true);
    setPincodeError("");

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
      const data = await res.json();

      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data[0].Status === "Success" &&
        Array.isArray(data[0].PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const postOffice = data[0].PostOffice[0];
        setCity(postOffice.District || postOffice.Name || "");
        setState(postOffice.State || "");
      } else {
        setPincodeError(
          "Pincode details not found automatically. You can enter City and State manually."
        );
      }
    } catch (err) {
      console.error("Pincode lookup error:", err);
      setPincodeError(
        "Could not verify pincode online. Please enter City and State manually."
      );
    } finally {
      setIsLookingUpPincode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Please enter your first and last name.");
      return;
    }

    if (!pincode.trim() || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setFormError("Please enter a valid 6-digit Indian pincode.");
      return;
    }

    if (!city.trim() || !state.trim()) {
      setFormError("Please provide both City and State.");
      return;
    }

    if (!user || !user.uid) {
      setFormError("Authentication session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      await setDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        email: user.email || "",
        createdAt: serverTimestamp(),
      });

      router.push("/");
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
        <p className="text-sm text-slate-500">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2.5">
          New Citizen Profile
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Complete Your Registration
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Provide your name and location to link verified reports to municipal priority pipelines.
        </p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        {/* User Account Pill */}
        {user && (
          <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Signed in as: <strong className="text-slate-800">{user.email}</strong></span>
            <span className="text-emerald-700 font-semibold">✓ Verified</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Aarav"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label htmlFor="last-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Pincode with Auto-lookup */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pincode" className="block text-xs font-semibold text-slate-700">
                Pincode <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">6 digits (Auto-detects location)</span>
            </div>

            <div className="relative">
              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={handlePincodeChange}
                placeholder="400053"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm font-medium tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all pr-10"
              />
              {isLookingUpPincode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {pincodeError && (
              <p className="text-xs text-amber-700 mt-1.5 font-medium">
                ⚠️ {pincodeError}
              </p>
            )}
          </div>

          {/* City & State Row (Auto-filled but editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                City / District <span className="text-rose-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-xs font-semibold text-slate-700 mb-1.5">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Maharashtra"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Form Error */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium">
              ❌ {formError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLookingUpPincode}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
