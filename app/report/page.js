"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import LocationFields from "@/components/LocationFields";

export default function ReportPage() {
  const router = useRouter();
  const locationRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [moderationWarning, setModerationWarning] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Track auth state and profile
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserProfile(data);
            if (data.pincode) setPincode(data.pincode);
            if (data.city) setCity(data.city);
            if (data.state) setState(data.state);
          } else {
            router.push("/register");
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setPincode("");
        setCity("");
        setState("");
      }
      setAuthChecking(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Device location not available:", error.message);
      }
    );
  }, []);

  const handleImageChange = (e) => {
    setError("");
    setWarning("");
    setModerationWarning("");
    setSuccessMessage("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedImages.length + files.length > 10) {
      setError("You can select up to 10 images in total.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    const newValidImages = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not an accepted format. Only JPEG, PNG, and WebP are allowed.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" exceeds the 5MB size limit.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      newValidImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedImages((prev) => [...prev, ...newValidImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (indexToRemove) => {
    setSelectedImages((prev) => {
      const img = prev[indexToRemove];
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const startRecording = async () => {
    setError("");
    setWarning("");
    setModerationWarning("");
    setSuccessMessage("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone access is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        // Stop all media tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());

        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError(
        "Microphone access was denied or is unavailable. Please check your browser permissions."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (audioBlob) => {
    setIsTranscribing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 || data.error === "rate_limited") {
          setError(
            data.message ||
              "You've submitted several complaints recently. Please wait a few minutes and try again."
          );
        } else if (res.status === 503 || data.error === "service_unavailable") {
          setError(
            data.message ||
              "We're experiencing high traffic right now. Please try again in a moment."
          );
        } else {
          setError(data.error || "Failed to transcribe audio.");
        }
        return;
      }

      if (data.transcript) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${data.transcript}` : data.transcript));
      }
    } catch (err) {
      console.error("Transcription request failed:", err);
      setError("Network error while transcribing audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError("You must be signed in to submit a complaint.");
      return;
    }

    if (!text.trim()) {
      setError("Please describe your complaint.");
      return;
    }

    const locationError = await locationRef.current?.validateAsync();
    if (locationError) {
      setError(locationError);
      return;
    }

    setError("");
    setWarning("");
    setModerationWarning("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const currentPincode = pincode.trim();
      const currentCity = city.trim();
      const currentState = state.trim();

      const res = await fetch("/api/tag-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userId: currentUser.uid,
          pincode: currentPincode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 || data.error === "rate_limited") {
          setError(
            data.message ||
              "You've submitted several complaints recently. Please wait a few minutes and try again."
          );
        } else if (res.status === 503 || data.error === "service_unavailable") {
          setError(
            data.message ||
              "We're experiencing high traffic right now. Please try again in a moment."
          );
        } else {
          setError(data.error || "Complaint text is too short.");
        }
        return;
      }

      if (!data.isActionable) {
        setError(
          "This doesn't appear to be a valid complaint. Please provide more detail about the issue."
        );
        return;
      }

      // Generate doc ID first so Supabase Storage and Firestore can reference the same complaintId
      const docRef = doc(collection(db, "complaints"));
      const complaintId = docRef.id;

      // Upload selected images to Supabase Storage with pre-moderation check
      const imageUrls = [];
      let uploadFailedCount = 0;
      let moderatedCount = 0;

      if (selectedImages.length > 0) {
        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          setUploadProgress(
            `Checking & uploading image ${i + 1} of ${selectedImages.length}...`
          );

          // 1. Moderate image via /api/moderate-image
          let isSafe = true;
          try {
            const modFormData = new FormData();
            modFormData.append("image", img.file);

            const modRes = await fetch("/api/moderate-image", {
              method: "POST",
              body: modFormData,
            });

            if (modRes.ok) {
              const modData = await modRes.json();
              if (modData.result === "UNSAFE") {
                isSafe = false;
              }
            }
          } catch (modErr) {
            console.warn(`Moderation check failed for ${img.file.name}, defaulting to safe:`, modErr);
            isSafe = true;
          }

          if (!isSafe) {
            moderatedCount++;
            continue; // Skip uploading this unsafe image
          }

          // 2. Upload via server (service role bypasses Supabase Storage RLS)
          try {
            const idToken = await currentUser.getIdToken();
            const uploadForm = new FormData();
            uploadForm.append("image", img.file);
            uploadForm.append("complaintId", complaintId);
            uploadForm.append("index", String(i));

            const uploadRes = await fetch("/api/upload-complaint-image", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
              body: uploadForm,
            });

            const uploadData = await uploadRes.json().catch(() => ({}));

            if (!uploadRes.ok) {
              throw new Error(uploadData.error || "Failed to upload image.");
            }

            if (uploadData?.publicUrl) {
              imageUrls.push(uploadData.publicUrl);
            }
          } catch (uploadErr) {
            console.error(`Failed to upload image ${img.file.name}:`, uploadErr);
            uploadFailedCount++;
          }
        }
        setUploadProgress("");
      }

      if (moderatedCount > 0) {
        setModerationWarning(
          `${moderatedCount} image(s) were removed for not meeting content guidelines.`
        );
      }

      if (uploadFailedCount > 0) {
        setWarning("Some images failed to upload.");
      }

      // Submitter name logic: if isAnonymous is false and userProfile has firstName, use it; otherwise null
      const submitterName = isAnonymous ? null : (userProfile?.firstName || null);

      // Write complaint document with userId, pincode, city, state, isDuplicateFlag, isAnonymous, submitterName, status: "registered"
      await setDoc(docRef, {
        userId: currentUser.uid,
        pincode: currentPincode,
        city: currentCity,
        state: currentState,
        isDuplicateFlag: Boolean(data.isDuplicateFlag),
        isAnonymous: Boolean(isAnonymous),
        submitterName: submitterName,
        text: text,
        location: location,
        deviceLocation: deviceLocation, // null if unavailable
        createdAt: serverTimestamp(),
        category: data.category,
        urgency: data.urgency,
        summary: data.summary,
        status: "registered",
        imageUrls: imageUrls,
      });

      // Cleanup local image preview URLs
      selectedImages.forEach((img) => {
        if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setSelectedImages([]);
      setText("");
      setLocation("");
      setIsAnonymous(false);
      if (userProfile) {
        setPincode(userProfile.pincode || "");
        setCity(userProfile.city || "");
        setState(userProfile.state || "");
      }
      setSuccessMessage("Your complaint has been successfully registered and queued for municipal review!");

      // Geocoding query constructed from landmark, city, and state
      const geocodeQuery = [location.trim(), currentCity, currentState]
        .filter(Boolean)
        .join(", ");

      if (geocodeQuery) {
        fetch("/api/geocode-complaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complaintId: docRef.id, location: geocodeQuery }),
        }).catch((err) => console.error("Geocoding request failed:", err));
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("Something went wrong while submitting your complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="ia-eyebrow">Submit</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Report a Civic Issue
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
          Describe roads, water, electricity, or healthcare concerns. Issues are
          classified, geocoded, and routed to the priority queue.
        </p>
      </div>

      {/* Auth Gating: Form when signed in, Login Callout when unauthenticated */}
      {authChecking ? (
        <div className="ia-card p-8 mb-12 text-center text-sm text-muted-foreground">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading user status...
        </div>
      ) : currentUser ? (
        <div className="ia-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-border/60 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Reporting as: <strong className="text-foreground">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}` : currentUser.email}</strong>
            </div>
            <div className="text-xs text-muted-foreground">
              {city ? `${city}, ${state}` : userProfile?.city ? `${userProfile.city}, ${userProfile.state}` : "Registered User"}{pincode ? ` (${pincode})` : ""}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. File / Image Upload Picker */}
            <div>
              <label className="block text-sm font-semibold text-foreground/90 mb-2">
                Attach Photos <span className="text-xs font-normal text-muted-foreground">(Up to 10 photos, max 5MB each)</span>
              </label>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="photo-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border bg-muted dark:bg-slate-900/40 text-foreground/80 hover:bg-muted hover:text-foreground cursor-pointer transition-colors ${
                    isSubmitting || selectedImages.length >= 10 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Add photos
                </label>
                <input
                  id="photo-upload"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isSubmitting || selectedImages.length >= 10}
                  className="hidden"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedImages.length > 0 ? `${selectedImages.length} photo(s) selected` : "No photos attached yet"}
                </span>
              </div>

              {/* Thumbnail Preview Strip */}
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3.5 p-3 rounded-xl bg-muted dark:bg-slate-900/40 border border-border">
                  {selectedImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shadow-xs group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isSubmitting}
                        title="Remove image"
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Voice Recording Action */}
            <div>
              <label className="block text-sm font-semibold text-foreground/90 mb-2">
                Voice Input <span className="text-xs font-normal text-muted-foreground">(Optional - speak your complaint in any language)</span>
              </label>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSubmitting || isTranscribing}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                    : "bg-muted hover:bg-muted text-foreground/90 border border-border/80"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span>{isRecording ? "Stop recording" : "Record voice complaint"}</span>
              </button>

              {/* Voice Status Indicators */}
              {isRecording && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold mt-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  Recording in progress... Click stop when done speaking.
                </div>
              )}

              {isTranscribing && (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mt-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Transcribing voice recording via Gemini...
                </div>
              )}
            </div>

            {/* 3. Complaint Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="complaint-text" className="block text-sm font-semibold text-foreground/90">
                  Complaint Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-muted-foreground">Any language supported</span>
              </div>

              <textarea
                id="complaint-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the issue in detail (e.g. Broken water pipeline near Metro station, overflowing garbage)..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm sm:text-base"
              />
            </div>

            {/* Landmark / Address Detail (Optional) */}
            <div>
              <label htmlFor="area-location" className="block text-sm font-semibold text-foreground/90 mb-2">
                Landmark / Address Detail <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="area-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Near Metro Station, opposite the market"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm sm:text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <span>ℹ️</span> We correlate device location coordinates in the background to assist automated geocoding.
              </p>
            </div>

            <div className="pt-1">
              <LocationFields
                ref={locationRef}
                idPrefix="report"
                pincode={pincode}
                city={city}
                state={state}
                onPincodeChange={setPincode}
                onCityChange={setCity}
                onStateChange={setState}
                disabled={isSubmitting}
                pincodeHint="Auto-detects city & state"
              />
            </div>

            {/* Anonymous Submission Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="anonymous-checkbox"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={isSubmitting}
                className="rounded text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4 border-border cursor-pointer"
              />
              <label
                htmlFor="anonymous-checkbox"
                className="text-sm font-medium text-foreground/80 cursor-pointer select-none"
              >
                Submit anonymously
              </label>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="p-3 rounded-xl ia-alert-info text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                {uploadProgress}
              </div>
            )}

            {/* Moderation Removal Notice */}
            {moderationWarning && (
              <div className="p-3 rounded-xl ia-alert-error text-sm">
                🛡️ {moderationWarning}
              </div>
            )}

            {/* Storage Upload Warning */}
            {warning && (
              <div className="p-3 rounded-xl ia-alert-warning text-sm">
                {warning}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl ia-alert-success text-sm font-medium flex items-center justify-between gap-3">
                <span>✅ {successMessage}</span>
                <Link
                  href="/feed"
                  className="underline font-semibold hover:text-emerald-900 dark:text-emerald-200 shrink-0"
                >
                  View Feed →
                </Link>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl ia-alert-error text-sm font-medium">
                ❌ {error}
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || isRecording || isTranscribing}
            className="ia-btn-primary w-full py-3 text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{uploadProgress || "Submitting Complaint..."}</span>
                </>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Sign In Prompt Callout */
        <div className="ia-card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto mb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            Sign in to submit a complaint
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            You must be signed in to submit civic issues. You can still choose to submit anonymously on the form.
          </p>
          <Link
            href="/login"
            className="ia-btn-primary px-5 py-2.5"
          >
            Sign in with email
          </Link>
        </div>
      )}
    </main>
  );
}
