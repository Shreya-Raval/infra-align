import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request) {
  try {
    // 1. Verify Caller Authentication via Bearer token
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
    const userDocRef = adminDb.collection("users").doc(callerUid);
    const userDocSnap = await userDocRef.get();

    // 2. Look up the caller's users/{uid} doc
    if (!userDocSnap.exists) {
      return Response.json(
        { error: "User profile not found." },
        { status: 404 }
      );
    }

    const userData = userDocSnap.data();

    // 3. Idempotent check: If already superadmin, return 200 success
    if (userData?.role === "superadmin") {
      return Response.json({
        success: true,
        message: "Already provisioned as superadmin.",
        role: "superadmin",
      });
    }

    // 4. Query users collection for any existing doc with role == "superadmin" (limit 1)
    const superadminQuery = await adminDb
      .collection("users")
      .where("role", "==", "superadmin")
      .limit(1)
      .get();

    if (!superadminQuery.empty) {
      const existingSuperadminDoc = superadminQuery.docs[0];
      if (existingSuperadminDoc.id !== callerUid) {
        return Response.json(
          { error: "Superadmin already provisioned" },
          { status: 403 }
        );
      }
    }

    // 5. Compare caller's email against server-only SUPERADMIN_EMAIL
    const configuredSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const callerEmail = (userData?.email || decodedToken.email || "")
      .trim()
      .toLowerCase();

    if (
      !configuredSuperadminEmail ||
      !callerEmail ||
      callerEmail !== configuredSuperadminEmail
    ) {
      return Response.json(
        { error: "Forbidden: Caller email is not authorized for superadmin bootstrap." },
        { status: 403 }
      );
    }

    // 6. Update caller's role to superadmin
    await userDocRef.update({
      role: "superadmin",
    });

    return Response.json({
      success: true,
      message: "Successfully bootstrapped as superadmin.",
      role: "superadmin",
    });
  } catch (error) {
    console.error("Bootstrap superadmin error:", error);
    return Response.json(
      { error: "Internal server error during superadmin bootstrap." },
      { status: 500 }
    );
  }
}
