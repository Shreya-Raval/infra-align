import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

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
        { error: "Forbidden: Only municipal managers or superadmins can access creator contact details." },
        { status: 403 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json().catch(() => ({}));
    let { userId, complaintId } = body;

    // If userId not provided directly, lookup from complaint doc
    if (!userId && complaintId) {
      const complaintSnap = await adminDb.collection("complaints").doc(complaintId).get();
      if (complaintSnap.exists) {
        userId = complaintSnap.data()?.userId;
      }
    }

    if (!userId || typeof userId !== "string") {
      return Response.json(
        { error: "Bad Request: Missing or invalid userId." },
        { status: 400 }
      );
    }

    // 3. Lookup user in Firestore users collection
    let email = null;
    let firstName = "";
    let lastName = "";
    let city = "";
    let state = "";
    let pincode = "";

    const targetUserDoc = await adminDb.collection("users").doc(userId).get();
    if (targetUserDoc.exists) {
      const data = targetUserDoc.data();
      email = data.email || null;
      firstName = data.firstName || "";
      lastName = data.lastName || "";
      city = data.city || "";
      state = data.state || "";
      pincode = data.pincode || "";
    }

    // 4. Fallback to Firebase Auth user record if email is not in Firestore doc
    if (!email) {
      try {
        const authUser = await adminAuth.getUser(userId);
        if (authUser && authUser.email) {
          email = authUser.email;
          if (!firstName && authUser.displayName) {
            firstName = authUser.displayName;
          }
        }
      } catch (authErr) {
        console.warn(`Could not find Auth user for UID ${userId}:`, authErr?.message);
      }
    }

    if (!email) {
      return Response.json(
        { error: "Creator email could not be located. The user account may have been deleted." },
        { status: 404 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim() || firstName || "Citizen";

    return Response.json({
      success: true,
      creator: {
        userId,
        email,
        name: fullName,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
      },
    });
  } catch (error) {
    console.error("Get creator contact error:", error);
    return Response.json(
      { error: "Internal server error retrieving creator contact." },
      { status: 500 }
    );
  }
}
