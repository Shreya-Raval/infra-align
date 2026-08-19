import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORIES = [
    "Roads",
    "Water Supply",
    "Electricity",
    "Sanitation/Health",
    "Education",
];

export async function POST(request) {
    try {
        const { complaintId, text } = await request.json();

        if (!complaintId || !text) {
            return Response.json(
                { error: "complaintId and text are required" },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

        const prompt = `You are a multilingual civic complaint classifier for a citizen reporting platform used across multiple countries. Complaints may be written in any language (English, Hindi, Gujarati, Portuguese, Arabic, etc.).

Read and understand the complaint regardless of its language, then respond with ONLY a JSON object, no other text, no markdown formatting, in this exact shape:
{"category": "Roads" | "Water Supply" | "Electricity" | "Sanitation/Health" | "Education", "urgency": 1-5, "summary": "one short sentence"}

Rules:
- "category" must be exactly one of the five values listed above, in English.
- "summary" must always be written in English, translated if the original complaint was in another language, regardless of the input language.
- "urgency" is an integer 1-5, where 5 means immediate danger to health/safety, and 1 means minor/cosmetic issue.

Complaint: "${text}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const cleaned = responseText.replace(/```json|```/g, "").trim();
        const tags = JSON.parse(cleaned);
        if (!VALID_CATEGORIES.includes(tags.category)) {
            console.warn(
                `Unexpected category from Gemini: "${tags.category}" — falling back to "Sanitation/Health"`
            );
            tags.category = "Sanitation/Health";
        }
        const urgencyNum = Number(tags.urgency);
        if (!Number.isInteger(urgencyNum) || urgencyNum < 1 || urgencyNum > 5) {
            console.warn(`Unexpected urgency from Gemini: "${tags.urgency}" — defaulting to 3`);
            tags.urgency = 3;
        } else {
            tags.urgency = urgencyNum;
        }

        await adminDb.collection("complaints").doc(complaintId).update({
            category: tags.category,
            urgency: tags.urgency,
            summary: tags.summary,
        });

        return Response.json({ success: true, tags });
    } catch (error) {
        console.error("Tagging error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}