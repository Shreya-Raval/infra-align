"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/**
 * Subscribes to Firebase Auth + Firestore user profile.
 * Uses onSnapshot so role changes (e.g. superadmin bootstrap) reflect immediately.
 */
export function useAuthProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        setLoading(true);
        unsubscribeProfile = onSnapshot(
          doc(db, "users", user.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserProfile(data);
              setUserRole(data.role || "citizen");
            } else {
              setUserProfile(null);
              setUserRole("citizen");
            }
            setLoading(false);
          },
          (err) => {
            console.error("User profile subscription error:", err);
            setUserProfile(null);
            setUserRole("citizen");
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return { currentUser, userProfile, userRole, loading };
}
