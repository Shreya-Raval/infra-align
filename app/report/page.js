"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function ReportPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
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
            setUserProfile(userDoc.data());
          } else {
            router.push("/register");
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
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

    if (!text.trim() && !location.trim()) {
      setError("Please enter both a complaint and a location.");
      return;
    }
    if (!text.trim()) {
      setError("Please describe your complaint.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter the area this complaint is about.");
      return;
    }

    setError("");
    setWarning("");
    setModerationWarning("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const userPincode = userProfile?.pincode || null;
      const userState = userProfile?.state || null;

      const res = await fetch("/api/tag-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userId: currentUser.uid,
          pincode: userPincode,
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

          // 2. Upload to Supabase Storage
          try {
            const filePath = `${complaintId}/${i}-${img.file.name}`;
            const { error: uploadError } = await supabase.storage
              .from("complaint-images")
              .upload(filePath, img.file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) {
              throw uploadError;
            }

            const { data: urlData } = supabase.storage
              .from("complaint-images")
              .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
              imageUrls.push(urlData.publicUrl);
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

      // Write complaint document with userId, pincode, state, isDuplicateFlag, isAnonymous, submitterName, status: "registered"
      await setDoc(docRef, {
        userId: currentUser.uid,
        pincode: userPincode,
        state: userState,
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
      setSuccessMessage("Your complaint has been successfully registered and queued for municipal review!");

      fetch("/api/geocode-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: docRef.id, location }),
      }).catch((err) => console.error("Geocoding request failed:", err));
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          Multilingual Citizen Voice Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Report a Civic Issue
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
          Submit roads, water, electricity, or healthcare concerns. Our multilingual AI classifies, geocodes, and routes complaints to public infrastructure priority queues.
        </p>
      </div>

      {/* Auth Gating: Form when signed in, Login Callout when unauthenticated */}
      {authChecking ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 mb-12 text-center text-sm text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading user status...
        </div>
      ) : currentUser ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 flex-wrap">
            <div className="text-xs text-slate-600">
              Reporting as: <strong className="text-slate-900">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}` : currentUser.email}</strong>
            </div>
            <div className="text-xs text-slate-500">
              📍 {userProfile?.city ? `${userProfile.city}, ${userProfile.state}` : "Registered User"} {userProfile?.pincode ? `(${userProfile.pincode})` : ""}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Complaint Text & Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="complaint-text" className="block text-sm font-semibold text-slate-800">
                  Complaint Description
                </label>
                <span className="text-xs text-slate-500">Any language supported</span>
              </div>

              <div className="relative">
                <textarea
                  id="complaint-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe the issue in detail (e.g. Broken water pipeline near Metro station, overflowing garbage)..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm sm:text-base pr-14"
                />

                {/* Microphone Action Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting || isTranscribing}
                  title={isRecording ? "Stop recording" : "Record voice complaint"}
                  className={`absolute right-3 top-3 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse-ring shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording ? "⏹" : "🎤"}
                </button>
              </div>

              {/* Voice Status Indicators */}
              {isRecording && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold mt-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  Recording in progress... Click the stop button when done speaking.
                </div>
              )}

              {isTranscribing && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold mt-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Transcribing voice recording via Gemini...
                </div>
              )}
            </div>

            {/* Area Location Input */}
            <div>
              <label htmlFor="area-location" className="block text-sm font-semibold text-slate-800 mb-2">
                Location / Area
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 text-base">📍</span>
                <input
                  id="area-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Area, Landmark, or City (e.g. Andheri West, Mumbai)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm sm:text-base"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <span>ℹ️</span> We correlate device location coordinates in the background to assist automated geocoding.
              </p>
            </div>

            {/* Image Attachment Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Attach Photos <span className="text-xs font-normal text-slate-500">(Up to 10 photos, max 5MB each)</span>
              </label>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="photo-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors ${
                    isSubmitting || selectedImages.length >= 10 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span>📷</span> Add Photos
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
                <span className="text-xs text-slate-500">
                  {selectedImages.length > 0 ? `${selectedImages.length} photo(s) selected` : "No photos attached yet"}
                </span>
              </div>

              {/* Thumbnail Preview Strip */}
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {selectedImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shadow-xs group"
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

            {/* Anonymous Submission Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="anonymous-checkbox"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={isSubmitting}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer"
              />
              <label
                htmlFor="anonymous-checkbox"
                className="text-sm font-medium text-slate-700 cursor-pointer select-none"
              >
                Submit anonymously
              </label>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                {uploadProgress}
              </div>
            )}

            {/* Moderation Removal Notice */}
            {moderationWarning && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                🛡️ {moderationWarning}
              </div>
            )}

            {/* Storage Upload Warning */}
            {warning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                ⚠️ {warning}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between gap-3">
                <span>✅ {successMessage}</span>
                <Link
                  href="/"
                  className="underline font-semibold hover:text-emerald-900 shrink-0"
                >
                  View Feed →
                </Link>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
                ❌ {error}
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || isRecording || isTranscribing}
              className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-base shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto mb-3">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Sign in to submit a complaint
          </h2>
          <p className="text-sm text-slate-600 mb-5 max-w-md mx-auto">
            You must be signed in to submit civic issues to municipal queues. You can still choose to submit anonymously when submitting.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            Sign In with Email Link →
          </Link>
        </div>
      )}
    </main>
  );
}
