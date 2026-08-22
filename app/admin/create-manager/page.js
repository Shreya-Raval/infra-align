"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function CreateManagerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Form Fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // States
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check auth and user role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || "citizen");
          } else {
            setUserRole("citizen");
          }
        } catch (err) {
          console.error("Failed to load user role:", err);
          setUserRole("citizen");
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Pincode auto-lookup
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
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Please enter an email address for the new manager.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter the manager's first and last name.");
      return;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      setError("Please enter a valid 6-digit postal pincode.");
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError("Please provide both City and State.");
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch("/api/create-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          pincode: pincode.trim(),
          city: city.trim(),
          state: state.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create manager account.");
        return;
      }

      setSuccessMessage(
        `Manager account for ${data.email} has been successfully provisioned with the "manager" role.`
      );
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPincode("");
      setCity("");
      setState("");
    } catch (err) {
      console.error("Create manager error:", err);
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Checking permissions...</p>
      </main>
    );
  }

  // Access Denied if not superadmin
  if (!currentUser || userRole !== "superadmin") {
    return (
      <main className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl mx-auto mb-3">
            🚫
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            You do not have authorization to view this area. Only provisioned <strong>superadmin</strong> accounts can create and manage administrative roles.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-2.5">
          👑 Superadmin Console
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Municipal Manager Account
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Provision administrative accounts with authority to view escalated complaints and manage department queues.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label htmlFor="manager-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manager Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="manager-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@muncipality.gov.in"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Managers will sign in passwordlessly using Email Link verification sent to this address.
            </p>
          </div>

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
                placeholder="Ramesh"
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
                placeholder="Patel"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Pincode with Auto-lookup */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pincode" className="block text-xs font-semibold text-slate-700">
                Assigned Jurisdiction Pincode <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">6 digits</span>
            </div>

            <div className="relative">
              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={handlePincodeChange}
                placeholder="380015"
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

          {/* City & State Row */}
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
                placeholder="Ahmedabad"
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
                placeholder="Gujarat"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium">
              ✅ {successMessage}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium">
              ❌ {error}
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
                <span>Provisioning Manager Account...</span>
              </>
            ) : (
              "Provision Manager Account"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
