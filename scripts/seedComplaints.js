const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Load .env.local variables for standalone Node execution
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

// Initialize Firebase Admin SDK
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const adminDb = getFirestore();

const COMPLAINTS = [
  { text: "Sewage water has been overflowing onto the street outside our house for over a week. It's starting to smell terrible and my kids have started getting rashes.", location: "Hinoo, Ranchi, Jharkhand" },
  { text: "There is no functioning government dispensary in our block. The nearest one is over 10km away and often has no doctor present.", location: "Bariatu, Ranchi, Jharkhand" },
  { text: "Garbage has not been collected in our locality for almost two weeks. It's piling up near the school and children walk past it every day.", location: "Doranda, Ranchi, Jharkhand" },
  { text: "Several cases of diarrhea reported in our neighborhood, we suspect the water supply is contaminated. No response from local authorities yet.", location: "Kokar, Ranchi, Jharkhand" },
  { text: "Open drain right next to the community water hand pump, water looks visibly dirty. Urgent health risk for the whole colony.", location: "Patna City, Bihar" },
  { text: "No proper toilet facility in our slum area, over 40 families affected. This has been an ongoing issue for months.", location: "Gaya, Bihar" },
  { text: "Paani ki bahut kami hai humare ilake mein, teen din se supply nahi aaya", location: "Ashok Nagar, Chennai, Tamil Nadu" },
  { text: "Water tanker hasn't come to our street in 5 days. We are relying on buying bottled water which most families can't afford.", location: "Velachery, Chennai, Tamil Nadu" },
  { text: "Municipal water supply pressure has dropped to almost nothing in the mornings, taps run dry by 7am.", location: "Adyar, Chennai, Tamil Nadu" },
  { text: "Frequent power cuts lasting 4-5 hours daily in our area, no prior notice given by the electricity board.", location: "Rohini, Delhi" },
  { text: "A live electrical wire has been hanging low near the bus stop for three days, very dangerous for pedestrians and children.", location: "Karol Bagh, Delhi" },
  { text: "Huge pothole on the main road has caused two accidents this week. Needs urgent repair before monsoon gets worse.", location: "Andheri East, Mumbai, Maharashtra" },
  { text: "Streetlights on our road have not worked for over a month, making it unsafe to walk at night.", location: "Dadar, Mumbai, Maharashtra" },
  { text: "Government school in our village has no functioning toilets for girls, many have stopped attending regularly because of this.", location: "Sitapur, Uttar Pradesh" },
  { text: "The primary school building's roof is leaking badly, classes get disrupted every time it rains.", location: "Warangal, Telangana" },
  { text: "Streetlight near the park flickers occasionally but still mostly works, minor annoyance.", location: "Jayanagar, Bangalore, Karnataka" },
  { text: "A small pothole has formed near our gate, not too deep but should probably be filled eventually.", location: "Kothrud, Pune, Maharashtra" },
  { text: "asdf test 123 checking this thing", location: "Nowhere" },
  { text: "Bijli bahut baar jaati hai humare mohalle mein, koi suchna nahi milti pehle se", location: "Bhagalpur, Bihar" }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed() {
  console.log(`Starting seed process for ${COMPLAINTS.length} complaints...\n`);
  let successCount = 0;

  for (let i = 0; i < COMPLAINTS.length; i++) {
    const item = COMPLAINTS[i];
    const indexStr = `${i + 1}/${COMPLAINTS.length}`;

    try {
      // 1. Insert into Firestore "complaints" collection
      const docRef = await adminDb.collection("complaints").add({
        text: item.text,
        location: item.location,
        deviceLocation: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 2. Call POST /api/tag-complaint
      try {
        const tagRes = await fetch("http://localhost:3000/api/tag-complaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaintId: docRef.id,
            text: item.text,
          }),
        });
        const tagData = await tagRes.json();
        if (tagRes.ok && tagData.category) {
          await docRef.update({
            category: tagData.category,
            urgency: tagData.urgency,
            summary: tagData.summary,
            isActionable: tagData.isActionable ?? true,
          });
        }
      } catch (tagErr) {
        console.warn(`[${indexStr}] Tagging request warning:`, tagErr.message);
      }

      // 3. Call POST /api/geocode-complaint
      try {
        await fetch("http://localhost:3000/api/geocode-complaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaintId: docRef.id,
            location: item.location,
          }),
        });
      } catch (geoErr) {
        console.warn(`[${indexStr}] Geocoding request warning:`, geoErr.message);
      }

      successCount++;
      console.log(`Seeded ${indexStr}: ${item.location} (ID: ${docRef.id})`);
    } catch (err) {
      console.error(`Failed to seed ${indexStr} (${item.location}):`, err.message);
    }

    // Delay ~1.5s between each complaint cycle to stay well under rate limits
    if (i < COMPLAINTS.length - 1) {
      await sleep(1500);
    }
  }

  console.log(`\nSeed completed! Successfully seeded ${successCount} out of ${COMPLAINTS.length} complaints.`);
}

seed().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
