import { adminDb } from "@/lib/firebaseAdmin";
import { callGemini } from "@/lib/gemini";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  return null;
}

function sanitizeIpToDocId(ip) {
  return ip.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function POST(request) {
  try {
    // 1. IP-based rate limiting check
    const clientIp = getClientIp(request);
    if (clientIp) {
      const docId = sanitizeIpToDocId(clientIp);
      const rateLimitRef = adminDb.collection("rateLimits").doc(docId);
      const docSnap = await rateLimitRef.get();

      const now = Date.now();
      let timestamps = [];

      if (docSnap.exists) {
        const data = docSnap.data();
        if (Array.isArray(data?.timestamps)) {
          timestamps = data.timestamps.filter(
            (ts) => typeof ts === "number" && now - ts < RATE_LIMIT_WINDOW_MS
          );
        }
      }

      if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return Response.json(
          {
            error: "rate_limited",
            message:
              "You've submitted several complaints recently. Please wait a few minutes and try again.",
          },
          { status: 429 }
        );
      }

      timestamps.push(now);
      await rateLimitRef.set({ timestamps });
    }

    // 2. Parse multipart form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return Response.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/webm";

    // 3. Transcribe audio with Gemini via callGemini
    let transcript;
    try {
      transcript = await callGemini([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        {
          text: "Transcribe the speech in this audio to text exactly as spoken. Preserve the original language and do not translate. Return ONLY the transcribed text with no additional commentary, labels, explanations, or markdown formatting.",
        },
      ]);
    } catch (geminiError) {
      console.error("Gemini API error in transcribe:", geminiError);
      return Response.json(
        {
          error: "service_unavailable",
          message:
            "We're experiencing high traffic right now. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    return Response.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return Response.json(
      { error: error.message || "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}
