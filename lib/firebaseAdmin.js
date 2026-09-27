import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function formatPrivateKey(key) {
  if (!key) return undefined;
  let formatted = key.trim();
  // Strip wrapping double or single quotes if added in Vercel UI
  if (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1).trim();
  }
  // Replace escaped newlines with actual newlines
  formatted = formatted.replace(/\\n/g, "\n");
  return formatted;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.replace(/^["']|["']$/g, "").trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.replace(/^["']|["']$/g, "").trim();
  const privateKey = formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FIREBASE_ADMIN_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");
    const errMsg = `Firebase Admin initialization failed: Missing env variables [${missing.join(", ")}]`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// Proxies ensure initialization happens on-demand inside route handler try/catch blocks
export const adminDb = new Proxy({}, {
  get(target, prop) {
    getAdminApp();
    const db = getFirestore();
    const val = db[prop];
    return typeof val === "function" ? val.bind(db) : val;
  }
});

let _cachedAuth = null;
export const adminAuth = new Proxy({}, {
  get(target, prop) {
    if (!_cachedAuth) {
      getAdminApp();
      // Lazy require isolates jwks-rsa/jose from routes that only need Firestore
      const { getAuth } = require("firebase-admin/auth");
      _cachedAuth = getAuth();
    }
    const val = _cachedAuth[prop];
    return typeof val === "function" ? val.bind(_cachedAuth) : val;
  }
});