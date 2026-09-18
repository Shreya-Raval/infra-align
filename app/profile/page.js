"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import {
    User,
    Mail,
    MapPin,
    ShieldCheck,
    CalendarDays,
    Hash,
    Building2,
} from "lucide-react";

const ROLE_LABELS = {
    superadmin: "Super Admin",
    manager: "Manager",
    citizen: "Citizen",
};

const ROLE_STYLES = {
    superadmin:
        "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
    manager:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    citizen:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600",
};

function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-3.5 border-b border-border/60 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    {label}
                </p>
                <p className="text-sm font-medium text-foreground break-all">{value}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const { currentUser, userProfile, userRole, loading } = useAuthProfile();

    useEffect(() => {
        if (!loading && !currentUser) {
            router.push("/login");
        }
    }, [loading, currentUser, router]);

    if (loading || !currentUser) {
        return (
            <main className="max-w-xl mx-auto px-4 py-20 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading profile...</p>
            </main>
        );
    }

    const displayName =
        userProfile
            ? [userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ")
            : null;

    const initials = displayName
        ? displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : (currentUser.email?.[0] || "U").toUpperCase();

    const location = [userProfile?.city, userProfile?.state]
        .filter(Boolean)
        .join(", ");

    const joinedDate = userProfile?.createdAt?.toDate
        ? userProfile.createdAt.toDate().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : null;

    const roleKey = userRole || "citizen";
    const roleLabel = ROLE_LABELS[roleKey] || "Citizen";
    const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.citizen;

    return (
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {/* Header */}
            <div className="mb-8">
                <p className="ia-eyebrow">Your account</p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    Profile
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Your account details and role on Infra-Align.
                </p>
            </div>

            {/* Avatar + Name Card */}
            <div className="ia-card p-6 sm:p-8 mb-5">
                <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 tracking-tight select-none">
                            {initials}
                        </span>
                    </div>

                    <div className="min-w-0">
                        {displayName ? (
                            <h2 className="text-xl font-bold text-foreground truncate">
                                {displayName}
                            </h2>
                        ) : (
                            <h2 className="text-base font-semibold text-muted-foreground italic">
                                Name not set
                            </h2>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {currentUser.email}
                        </p>
                        <span
                            className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleStyle}`}
                        >
                            {roleLabel}
                        </span>
                    </div>
                </div>
            </div>

            {/* Details Card */}
            <div className="ia-card p-6 sm:p-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Account Details
                </h3>

                <div className="mt-3">
                    <InfoRow icon={Mail} label="Email Address" value={currentUser.email} />
                    <InfoRow
                        icon={User}
                        label="Full Name"
                        value={displayName || undefined}
                    />
                    <InfoRow icon={ShieldCheck} label="Role" value={roleLabel} />
                    {location && (
                        <InfoRow icon={MapPin} label="Location" value={location} />
                    )}
                    {userProfile?.state && !location && (
                        <InfoRow icon={Building2} label="State" value={userProfile.state} />
                    )}
                    {userProfile?.pincode && (
                        <InfoRow icon={Hash} label="Pincode" value={userProfile.pincode} />
                    )}
                    {joinedDate && (
                        <InfoRow icon={CalendarDays} label="Member Since" value={joinedDate} />
                    )}
                </div>
            </div>

            {/* UID (subtle, for technical reference) */}
            <p className="mt-4 text-center text-[11px] text-muted-foreground/50 font-mono select-all">
                UID: {currentUser.uid}
            </p>
        </main>
    );
}
