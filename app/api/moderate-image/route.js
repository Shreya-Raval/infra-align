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
              "You've submitted several requests recently. Please wait a few minutes and try again.",
          },
          { status: 429 }
        );
      }

      timestamps.push(now);
      await rateLimitRef.set({
        timestamps,
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    // 2. Parse multipart form data with image file
    const formData = await request.formData();
    const imageFile = formData.get("image") || formData.get("file");

    if (!imageFile) {
      return Response.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // 3. AI Moderation with Gemini via callGemini
    let decision = "SAFE";
    try {
      const prompt = `Classify this image as either "SAFE" or "UNSAFE" for a public civic complaint platform — UNSAFE meaning explicit/adult content, graphic violence/gore, or clearly irrelevant/inappropriate content unrelated to a civic issue report. Respond with ONLY the single word SAFE or UNSAFE, nothing else.`;

      const responseText = await callGemini([
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: prompt,
        },
      ]);

      const cleanedText = responseText.toUpperCase();
      if (cleanedText.includes("UNSAFE")) {
        decision = "UNSAFE";
      } else {
        decision = "SAFE";
      }
    } catch (geminiError) {
      console.warn("Gemini moderation error (failing open to SAFE):", geminiError);
      decision = "SAFE";
    }

    return Response.json({ result: decision });
  } catch (error) {
    console.error("Image moderation endpoint error:", error);
    // Fail open if unexpected error occurs
    return Response.json({ result: "SAFE" });
  }
}
