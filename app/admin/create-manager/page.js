"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import LocationFields from "@/components/LocationFields";

export default function CreateManagerPage() {
  const { currentUser, userRole, loading: authChecking } = useAuthProfile();
  const locationRef = useRef(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

    const locationError = await locationRef.current?.validateAsync();
    if (locationError) {
      setError(locationError);
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
        <p className="text-sm text-muted-foreground">Checking permissions...</p>
      </main>
    );
  }

  // Access Denied if not superadmin
  if (!currentUser || userRole !== "superadmin") {
    return (
      <main className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="ia-card p-8">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-600 dark:text-rose-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" strokeLinecap="round" />
              <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            You do not have authorization to view this area. Only provisioned <strong>superadmin</strong> accounts can create and manage administrative roles.
          </p>
          <Link
            href="/"
            className="ia-btn-primary px-4 py-2 text-xs"
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
        <p className="ia-eyebrow">Admin</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Create Municipal Manager Account
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Provision accounts that can review escalated complaints and update status.
        </p>
      </div>

      {/* Form Card */}
      <div className="ia-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label htmlFor="manager-email" className="block text-xs font-semibold text-foreground/80 mb-1.5">
              Manager Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="manager-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@muncipality.gov.in"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Managers will sign in passwordlessly using Email Link verification sent to this address.
            </p>
          </div>

          {/* Name Row */}
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
                placeholder="Ramesh"
                disabled={isSubmitting}
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
                placeholder="Patel"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <LocationFields
            ref={locationRef}
            idPrefix="manager"
            pincode={pincode}
            city={city}
            state={state}
            onPincodeChange={setPincode}
            onCityChange={setCity}
            onStateChange={setState}
            disabled={isSubmitting}
            pincodeLabel="Assigned Jurisdiction Pincode"
            pincodeHint="6 digits"
          />

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-xl ia-alert-success text-xs sm:text-sm font-medium">
              ✅ {successMessage}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl ia-alert-error text-xs sm:text-sm font-medium">
              ❌ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="ia-btn-primary w-full py-3"
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
