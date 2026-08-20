import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST() {
  try {
    // 1. Fetch complaints from Firestore Admin SDK
    const snapshot = await adminDb.collection("complaints").get();
    const complaints = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (
        typeof data.lat === "number" &&
        typeof data.lng === "number" &&
        !isNaN(data.lat) &&
        !isNaN(data.lng) &&
        typeof data.category === "string" &&
        data.category.trim().length > 0
      ) {
        complaints.push({
          id: doc.id,
          location: data.location || "Unknown location",
          category: data.category,
          urgency: data.urgency ?? 3,
          summary: data.summary || data.text || "No summary provided",
          lat: data.lat,
          lng: data.lng,
        });
      }
    });

    // 2. Handle zero eligible complaints
    if (complaints.length === 0) {
      return Response.json({
        report: [],
        message: "Not enough tagged complaints yet to generate a report.",
      });
    }

    // 3. Read and parse state hospital CSV from filesystem
    const csvPath = path.join(
      process.cwd(),
      "public",
      "data",
      "govt_hospitals_by_state.csv"
    );
    let hospitals = [];
    if (fs.existsSync(csvPath)) {
      const csvFile = fs.readFileSync(csvPath, "utf8");
      const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      hospitals = (parsed.data || []).map((row) => ({
        state: row.state,
        govt_hospitals_total: row.govt_hospitals_total,
      }));
    }

    // 4. Generate priority report with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const prompt = `You are an expert civic infrastructure analyst. Analyze the following geo-tagged citizen complaints alongside government hospital infrastructure data to identify civic risk hotspots and recommend prioritized civic interventions.

Complaint Data (Location, Category, Urgency (1-5), Summary):
${JSON.stringify(complaints, null, 2)}

State Hospital Capacity Data:
${JSON.stringify(hospitals, null, 2)}

Instructions:
- Analyze real patterns, geographic clusters, high urgency issues, category density, and correlations with regional healthcare/civic infrastructure.
- Propose a RANKED list of 3 to 7 high-impact, actionable civic projects or interventions.
- Each item must address an actual pattern in the provided data (e.g. clustering of high-urgency complaints in an area with low hospital density, or a category with many unresolved complaints in one region).
- Return ONLY a valid JSON array of objects, with no other text and no markdown formatting.

JSON Schema for each object:
[
  {
    "rank": 1,
    "title": "Short title of project/intervention",
    "reasoning": "1-2 sentences explaining why, referencing specific data points seen.",
    "relatedCategory": "Roads" | "Water Supply" | "Electricity" | "Sanitation/Health" | "Education" | "Other" | "Multiple",
    "affectedArea": "Area or State name most affected"
  }
]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const report = JSON.parse(cleaned);

    return Response.json({
      report: Array.isArray(report) ? report : [],
    });
  } catch (error) {
    console.error("Priority Report Error:", error);
    return Response.json(
      { error: error.message || "Failed to generate priority report" },
      { status: 500 }
    );
  }
}
