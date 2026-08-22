import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const ALLOWED_STATUSES = ["registered", "in progress", "closed"];

export async function POST(request) {
  try {
    // 1. Verify Manager / Superadmin Authentication via Bearer token
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Unauthorized: Missing or invalid authorization token." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return Response.json(
        { error: "Unauthorized: Token missing." },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr) {
      console.error("Token verification failed:", tokenErr);
      return Response.json(
        { error: "Unauthorized: Invalid or expired token." },
        { status: 401 }
      );
    }

    const callerUid = decodedToken.uid;
    const callerDocSnap = await adminDb.collection("users").doc(callerUid).get();

    if (!callerDocSnap.exists) {
      return Response.json(
        { error: "Forbidden: User profile not found." },
        { status: 403 }
      );
    }

    const callerData = callerDocSnap.data();
    const callerRole = callerData?.role || "citizen";

    if (callerRole !== "manager" && callerRole !== "superadmin") {
      return Response.json(
        { error: "Forbidden: Only municipal managers or superadmins can update complaint status." },
        { status: 403 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json().catch(() => ({}));
    const { complaintId, newStatus } = body;

    if (!complaintId || typeof complaintId !== "string" || !complaintId.trim()) {
      return Response.json(
        { error: "Complaint ID is required." },
        { status: 400 }
      );
    }

    const normalizedStatus = (newStatus || "").trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return Response.json(
        {
          error:
            'Invalid status. Manager-settable status must be "registered", "in progress", or "closed".',
        },
        { status: 400 }
      );
    }

    // 3. Verify Complaint Exists
    const complaintRef = adminDb.collection("complaints").doc(complaintId.trim());
    const complaintSnap = await complaintRef.get();

    if (!complaintSnap.exists) {
      return Response.json(
        { error: "Complaint not found." },
        { status: 404 }
      );
    }

    // 4. Update Complaint with Status and Public Attribution
    const statusChangedByName = callerData.firstName || "Official";
    const statusChangedByState = callerData.state || "";

    await complaintRef.update({
      status: normalizedStatus,
      statusChangedByName: statusChangedByName,
      statusChangedByState: statusChangedByState,
      statusChangedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({
      success: true,
      complaintId: complaintId.trim(),
      status: normalizedStatus,
      statusChangedByName: statusChangedByName,
      statusChangedByState: statusChangedByState,
    });
  } catch (error) {
    console.error("Update complaint status error:", error);
    return Response.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
