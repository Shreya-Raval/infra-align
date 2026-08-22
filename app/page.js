"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function StatusBadge({ status }) {
  const currentStatus = (status || "registered").toLowerCase();

  const statusConfig = {
    registered: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-200",
      label: "Registered",
    },
    "in progress": {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      label: "In Progress",
    },
    closed: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      label: "Closed",
    },
    withdrawn: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      border: "border-rose-200",
      label: "Withdrawn",
    },
  };

  const current = statusConfig[currentStatus] || statusConfig.registered;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComplaints(data);
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e) => {
    setError("");
    setWarning("");
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
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tag-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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

      // Generate doc ID first so Firebase Storage and Firestore can reference the same complaintId
      const docRef = doc(collection(db, "complaints"));
      const complaintId = docRef.id;

      // Upload selected images to Firebase Storage
      const imageUrls = [];
      let uploadFailedCount = 0;

      if (selectedImages.length > 0) {
        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          setUploadProgress(`Uploading photo ${i + 1} of ${selectedImages.length}...`);
          try {
            const storageRef = ref(
              storage,
              `complaints/${complaintId}/${i}-${img.file.name}`
            );
            const snapshot = await uploadBytes(storageRef, img.file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            imageUrls.push(downloadUrl);
          } catch (uploadErr) {
            console.error(`Failed to upload image ${img.file.name}:`, uploadErr);
            uploadFailedCount++;
          }
        }
        setUploadProgress("");
      }

      if (uploadFailedCount > 0) {
        setWarning("Some images failed to upload.");
      }

      // Write complaint document with status: "registered" and imageUrls
      await setDoc(docRef, {
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

  const displayedComplaints = complaints.filter(
    (c) => showWithdrawn || (c.status || "registered").toLowerCase() !== "withdrawn"
  );

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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

      {/* Submission Card Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-12">
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

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              {uploadProgress}
            </div>
          )}

          {/* Warning Message */}
          {warning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              ⚠️ {warning}
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

      {/* Submitted Complaints Live Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Submitted Complaints</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {displayedComplaints.length}
            </span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWithdrawn}
              onChange={(e) => setShowWithdrawn(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
            />
            Show withdrawn complaints
          </label>
        </div>

        {displayedComplaints.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No complaints found matching current filter.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedComplaints.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 transition-colors shadow-xs"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.category && (
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c.category}
                      </span>
                    )}
                    {c.urgency !== undefined && c.urgency !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          c.urgency >= 4
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : c.urgency === 3
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        Urgency: {c.urgency}/5
                      </span>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Complaint Text */}
                <p className="text-slate-900 font-medium text-sm sm:text-base leading-relaxed mb-2.5">
                  {c.text}
                </p>

                {/* AI Summary / Translation if present */}
                {c.summary && c.summary !== c.text && (
                  <p className="text-xs text-slate-500 italic mb-2.5">
                    💡 AI Summary: &ldquo;{c.summary}&rdquo;
                  </p>
                )}

                {/* Location Footer */}
                <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    📍 {c.location}
                  </span>
                  {c.createdAt?.toDate && (
                    <span>{c.createdAt.toDate().toLocaleDateString()}</span>
                  )}
                </div>

                {/* Attached Image Gallery */}
                {c.imageUrls && c.imageUrls.length > 0 && (
                  <div className="flex gap-2.5 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                    {c.imageUrls.map((url, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}