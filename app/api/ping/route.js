export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    const doc = await adminDb.collection("priorityReports").doc("latest").get();
    return Response.json({
      status: "ok",
      docExists: doc.exists,
      reportLength: doc.data()?.report?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({
      status: "error",
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}

