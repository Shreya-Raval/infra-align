export const dynamic = "force-dynamic";

export async function GET() {
  const envSummary = {
    hasFirebaseKey: Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    firebaseKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
    hasProjectId: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID),
    projectIdVal: process.env.FIREBASE_ADMIN_PROJECT_ID || null,
    hasClientEmail: Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    clientEmailVal: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || null,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    nodeVersion: process.version,
  };

  return Response.json({
    status: "ok",
    env: envSummary,
    timestamp: new Date().toISOString(),
  });
}
