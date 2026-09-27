import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const doc = await adminDb.collection("priorityReports").doc("latest").get();
    return Response.json({
      status: "ok",
      docExists: doc.exists,
      data: doc.data(),
    });
  } catch (err) {
    return Response.json({
      status: "error",
      message: err.message,
      stack: err.stack,
      name: err.name,
    }, { status: 500 });
  }
}

