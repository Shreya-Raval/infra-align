import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_CATEGORIES = [
  "Roads",
  "Water Supply",
  "Electricity",
  "Sanitation/Health",
  "Education",
  "Other",
];

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return Response.json(
        { error: "Complaint text is too short." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `You are a multilingual civic complaint classifier for a citizen reporting platform used across multiple countries. Complaints may be written in any language (English, Hindi, Gujarati, Portuguese, Arabic, etc.).

Read and understand the complaint regardless of its language, then respond with ONLY a JSON object, no other text, no markdown formatting, in this exact shape:
{"category": "Roads" | "Water Supply" | "Electricity" | "Sanitation/Health" | "Education" | "Other", "urgency": 1-5, "summary": "one short sentence", "isActionable": true | false}

Rules:
- "category" must be exactly one of the six values listed above, in English. Only choose "Other" when the complaint clearly does not fit any of the other 5 categories — do not default to "Other" out of laziness or ambiguity; make your best effort to fit one of the original 5 categories first.
- "summary" must always be written in English, translated if the original complaint was in another language.
- "urgency" is an integer 1-5, where 5 means immediate danger to health/safety, and 1 means minor/cosmetic issue.
- "isActionable" should be false if the text is gibberish, a test message, spam, or does not describe a real civic issue. Otherwise true.

Complaint: "${text}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const tags = JSON.parse(cleaned);
    if (!VALID_CATEGORIES.includes(tags.category)) {
      console.warn(
        `Unexpected category from Gemini: "${tags.category}" — falling back to "Other"`
      );
      tags.category = "Other";
    }
    const urgencyNum = Number(tags.urgency);
    if (!Number.isInteger(urgencyNum) || urgencyNum < 1 || urgencyNum > 5) {
      console.warn(`Unexpected urgency from Gemini: "${tags.urgency}" — defaulting to 3`);
      tags.urgency = 3;
    } else {
      tags.urgency = urgencyNum;
    }

    return Response.json({
      category: tags.category,
      urgency: tags.urgency,
      summary: tags.summary,
      isActionable: tags.isActionable ?? true,
    });
  } catch (error) {
    console.error("Tagging error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}