import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    // 1. Verify Superadmin Authentication via Bearer token
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

    if (!callerDocSnap.exists || callerDocSnap.data()?.role !== "superadmin") {
      return Response.json(
        { error: "Forbidden: Superadmin access required." },
        { status: 403 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json().catch(() => ({}));
    const { email, firstName, lastName, pincode, city, state } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !email.trim() ||
      !firstName ||
      typeof firstName !== "string" ||
      !firstName.trim() ||
      !lastName ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      !pincode ||
      typeof pincode !== "string" ||
      !pincode.trim() ||
      !city ||
      typeof city !== "string" ||
      !city.trim() ||
      !state ||
      typeof state !== "string" ||
      !state.trim()
    ) {
      return Response.json(
        {
          error:
            "All fields (email, firstName, lastName, pincode, city, state) are required and must be non-empty strings.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return Response.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // 3. Create Auth User in Firebase Auth
    let newAuthUser;
    try {
      newAuthUser = await adminAuth.createUser({
        email: normalizedEmail,
      });
    } catch (authErr) {
      if (authErr.code === "auth/email-already-exists") {
        return Response.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }
      console.error("Firebase Auth user creation error:", authErr);
      return Response.json(
        { error: authErr.message || "Failed to create authentication record." },
        { status: 500 }
      );
    }

    // 4. Create Firestore document directly under users/{newUid} with role "manager"
    try {
      await adminDb.collection("users").doc(newAuthUser.uid).set({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        email: normalizedEmail,
        role: "manager",
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.error("Firestore user doc creation error:", dbErr);
      return Response.json(
        {
          error:
            "Authentication record created, but failed to initialize user profile in database.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        uid: newAuthUser.uid,
        email: normalizedEmail,
        message: "Manager account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create manager endpoint error:", error);
    return Response.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
