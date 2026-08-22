import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3.5-flash-lite";

function isQuotaOrRateLimitError(err) {
  const errMsg = err?.message || "";
  return (
    err?.status === 429 ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.toLowerCase().includes("quota") ||
    errMsg.toLowerCase().includes("rate limit")
  );
}

export async function callGemini(promptOrParts) {
  const primaryApiKey = process.env.GEMINI_API_KEY;
  const backupApiKey = process.env.GEMINI_API_KEY_BACKUP;

  const primaryClient = new GoogleGenerativeAI(primaryApiKey);
  const primaryModel = primaryClient.getGenerativeModel({ model: MODEL_NAME });

  let responseText;

  try {
    const result = await primaryModel.generateContent(promptOrParts);
    responseText = result.response.text();
  } catch (primaryErr) {
    if (isQuotaOrRateLimitError(primaryErr) && backupApiKey) {
      console.warn(
        "Primary GEMINI_API_KEY quota/rate-limit reached. Retrying with GEMINI_API_KEY_BACKUP..."
      );
      try {
        const backupClient = new GoogleGenerativeAI(backupApiKey);
        const backupModel = backupClient.getGenerativeModel({
          model: MODEL_NAME,
        });
        const backupResult = await backupModel.generateContent(promptOrParts);
        responseText = backupResult.response.text();
      } catch (backupErr) {
        console.error("Backup Gemini API call also failed:", backupErr);
        throw backupErr;
      }
    } else {
      throw primaryErr;
    }
  }

  return responseText.replace(/```json|```/g, "").trim();
}
