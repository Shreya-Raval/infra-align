const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// 1. Load environment variables from .env.local
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

// 2. Initialize Firebase Admin
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
const adminAuth = getAuth();

// Known User IDs from existing Auth
const USER_KAUSHAL_CITIZEN = "whakIiBFB1VaIUDVrL8tvRFLbHA3"; // kaushalsatani@gmail.com
const USER_KAUSHAL_ADMIN = "ZAh7rUzChsQxtGSt2bYcjlu44ch1";   // aicluster.ai@gmail.com
const USER_SHREYA = "uK5lwRm3KmXAYDZZdScIFOhP1IX2";          // ravalshreya.2004@gmail.com
const USER_SILVEROAK = "S17DOB0mXURdcY8znqVda2LShkC2";       // 2202031800034@silveroakuni.ac.in
const USER_PIKACHU = "nWhC4HEWB5ZEUnwoqtSzur4mvSp2";         // pikachuu.3002@gmail.com

// Helper to compute realistic timestamps
const now = Date.now();
const minutesAgo = (m) => Timestamp.fromMillis(now - m * 60 * 1000);
const hoursAgo = (h) => Timestamp.fromMillis(now - h * 3600 * 1000);
const daysAgo = (d, h = 0) => Timestamp.fromMillis(now - (d * 24 + h) * 3600 * 1000);

const SEED_COMPLAINTS = [
  // ==========================================
  // GUJARAT - SURENDRA NAGAR (User Hometown)
  // ==========================================
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Main Market Road near M.P. Shah College",
    city: "Surendra Nagar",
    state: "Gujarat",
    pincode: "363001",
    lat: 22.7234,
    lng: 71.6372,
    deviceLocation: { lat: 22.7234, lng: 71.6372 },
    category: "Roads",
    urgency: 4,
    status: "in progress",
    text: "Deep potholes on the main access road outside M.P. Shah Arts & Science College have caused multiple two-wheeler slips, especially during evening hours. The road surface has completely eroded over a 200-meter stretch.",
    summary: "Severe potholes outside M.P. Shah College posing risk to students and daily commuters.",
    createdAt: hoursAgo(3), // Filed today!
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: hoursAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Joravarnagar Railway Crossing Road",
    city: "Surendra Nagar",
    state: "Gujarat",
    pincode: "363020",
    lat: 22.7058,
    lng: 71.6501,
    deviceLocation: { lat: 22.7058, lng: 71.6501 },
    category: "Water Supply",
    urgency: 4,
    status: "registered",
    text: "Underground drinking water supply pipeline has burst near Joravarnagar railway crossing. Potable water is flooding the street for the past 24 hours while nearby residential quarters have zero water pressure.",
    summary: "Burst drinking water pipeline causing street flooding and pressure loss in Joravarnagar.",
    createdAt: hoursAgo(6), // Filed today!
    imageUrls: [],
  },
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Opposite Civil Hospital, Bus Station Road",
    city: "Surendra Nagar",
    state: "Gujarat",
    pincode: "363001",
    lat: 22.7289,
    lng: 71.6421,
    deviceLocation: { lat: 22.7289, lng: 71.6421 },
    category: "Electricity",
    urgency: 3,
    status: "closed",
    text: "Three consecutive streetlights on the road opposite Civil Hospital have been completely dark for over 10 days, making pedestrian crossing dangerous for hospital visitors at night.",
    summary: "Streetlights repaired and reconnected on the approach road to Civil Hospital.",
    createdAt: daysAgo(4),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Wadhwan City Gate Circle",
    city: "Surendra Nagar",
    state: "Gujarat",
    pincode: "363030",
    lat: 22.6985,
    lng: 71.6782,
    deviceLocation: { lat: 22.6985, lng: 71.6782 },
    category: "Sanitation/Health",
    urgency: 3,
    status: "registered",
    text: "Community garbage collection dumpster at Wadhwan gate is overflowing with waste spilling onto the main road. Stray cattle are congregating, causing frequent traffic bottlenecks and foul odor.",
    summary: "Overflowing community dumpster and waste spillage at Wadhwan City Gate.",
    createdAt: daysAgo(1, 4),
    imageUrls: [],
  },
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near Dhrangadhra Highway Junction",
    city: "Surendra Nagar",
    state: "Gujarat",
    pincode: "363020",
    lat: 22.7391,
    lng: 71.6215,
    deviceLocation: { lat: 22.7391, lng: 71.6215 },
    category: "Roads",
    urgency: 2,
    status: "withdrawn",
    text: "Broken divider curb stones scattered onto the right lane after a truck hit it last weekend. Local volunteers cleared it this morning.",
    summary: "Scattered curb stones obstructing highway junction lane (cleared by volunteers).",
    createdAt: daysAgo(5),
    imageUrls: [],
  },

  // ==========================================
  // GUJARAT - AHMEDABAD
  // ==========================================
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Orchid Blues, South Bopal / Shela",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380058",
    lat: 22.9925,
    lng: 72.4578,
    deviceLocation: { lat: 22.9925, lng: 72.4578 },
    category: "Roads",
    urgency: 4,
    status: "in progress",
    text: "Critical waterlogging persisting on Club O7 to Orchid Blues approach road in Shela. Water accumulation of nearly 1.5 feet blocks school vans and resident vehicles even after moderate rain.",
    summary: "Persistent 1.5-foot waterlogging on Shela approach road blocking traffic and school buses.",
    createdAt: hoursAgo(5), // Filed today!
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: hoursAgo(2),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: "Shreya",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near D-Cabin Railway Overbridge, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380024",
    lat: 23.1098,
    lng: 72.5842,
    deviceLocation: { lat: 23.1098, lng: 72.5842 },
    category: "Roads",
    urgency: 3,
    status: "registered",
    text: "Asphalt on the D-Cabin railway overbridge descent has cracked open with exposed metal expansion joints. Daily commuters from Chandkheda to Sabarmati are facing severe delays and vehicle damage.",
    summary: "Damaged bridge surface and exposed expansion joints near Chandkheda D-Cabin.",
    createdAt: daysAgo(1, 2),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: "Shreya",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Tagore Park Road, Vastrapur",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    lat: 23.0361,
    lng: 72.5312,
    deviceLocation: { lat: 23.0361, lng: 72.5312 },
    category: "Sanitation/Health",
    urgency: 4,
    status: "registered",
    text: "Underground sewer line has backed up into the stormwater gully trap near Vastrapur Lake peripheral road. Foul black wastewater is overflowing near food stalls and residential apartments.",
    summary: "Sewage overflow contaminating stormwater drains near Vastrapur Lake.",
    createdAt: daysAgo(2),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Near SG Highway Underpass, Thaltej",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380054",
    lat: 23.0538,
    lng: 72.5084,
    deviceLocation: { lat: 23.0538, lng: 72.5084 },
    category: "Electricity",
    urgency: 5,
    status: "in progress",
    text: "An electric feeder pillar box has its metal door ripped off with live 415V cables exposed right next to the pedestrian footpath near Thaltej crossroads. High risk of electrocution during rains.",
    summary: "Uncovered electric distribution box with live wires exposed on pedestrian walkway.",
    createdAt: daysAgo(2, 6),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1, 2),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Government Primary School No. 4, Naroda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382330",
    lat: 23.0682,
    lng: 72.6517,
    deviceLocation: null,
    category: "Education",
    urgency: 4,
    status: "registered",
    text: "The boundary wall of Government Primary School Naroda has partially collapsed following recent rains. Cattle enter the playground during school hours and the safety of young children is compromised.",
    summary: "Collapsed school boundary wall allowing stray animals onto school premises.",
    createdAt: daysAgo(3),
    imageUrls: [],
  },
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Law Garden Night Market Plaza, Ellisbridge",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380006",
    lat: 23.0248,
    lng: 72.5594,
    deviceLocation: { lat: 23.0248, lng: 72.5594 },
    category: "Other",
    urgency: 2,
    status: "closed",
    text: "Broken stone pavers and open trench left unfenced after optical fiber line installation work near Law Garden pathway. Pedestrians frequently trip.",
    summary: "Utility trench repaved and stone pavers leveled near Law Garden pathway.",
    createdAt: daysAgo(6),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(2),
    imageUrls: [],
  },

  // ==========================================
  // GUJARAT - SURAT, VADODARA, RAJKOT
  // ==========================================
  {
    userId: USER_PIKACHU,
    submitterName: "Bhavik",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Ring Road Textile Market, Athwa",
    city: "Surat",
    state: "Gujarat",
    pincode: "395002",
    lat: 21.1895,
    lng: 72.8273,
    deviceLocation: { lat: 21.1895, lng: 72.8273 },
    category: "Roads",
    urgency: 3,
    status: "registered",
    text: "Huge sinkhole developing around stormwater drain manhole near Ring Road Flyover pillar 18. Heavy commercial truck traffic is aggravating the depression.",
    summary: "Developing sinkhole around drainage manhole on Ring Road Flyover corridor.",
    createdAt: daysAgo(1, 8),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Nitin",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near Varachha Main Road, Varachha",
    city: "Surat",
    state: "Gujarat",
    pincode: "395006",
    lat: 21.2215,
    lng: 72.8592,
    deviceLocation: null,
    category: "Water Supply",
    urgency: 3,
    status: "in progress",
    text: "Low water supply pressure for past one week in mini-bazar residential blocks. Upper floors are receiving no water even with booster pumps.",
    summary: "Severe drop in municipal drinking water pressure across Varachha residential sector.",
    createdAt: daysAgo(3, 4),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: "Tanvi",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Alkapuri Main Commercial Complex",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "390007",
    lat: 22.3129,
    lng: 73.1764,
    deviceLocation: { lat: 22.3129, lng: 73.1764 },
    category: "Electricity",
    urgency: 3,
    status: "closed",
    text: "Commercial high-mast light at Alkapuri central roundabout stopped operating, leaving key transit intersection in total darkness after 8 PM.",
    summary: "High-mast illumination restored at Alkapuri central roundabout.",
    createdAt: daysAgo(7),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(3),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Government Girls High School, Sayajiganj",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "390020",
    lat: 22.3081,
    lng: 73.1873,
    deviceLocation: null,
    category: "Education",
    urgency: 4,
    status: "registered",
    text: "Roof leakage in two primary classrooms during monsoon downpours. Rainwater drips onto benches and electrical fixtures, forcing combined class sessions.",
    summary: "Severe roof leaks inside classrooms at Government Girls High School.",
    createdAt: daysAgo(4, 2),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: "Dharmesh",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near Madhapar Chokdi, Jamnagar Road",
    city: "Rajkot",
    state: "Gujarat",
    pincode: "360006",
    lat: 22.3218,
    lng: 70.7712,
    deviceLocation: { lat: 22.3218, lng: 70.7712 },
    category: "Sanitation/Health",
    urgency: 3,
    status: "in progress",
    text: "Stagnant open wastewater pond formed behind vacant plots near Madhapar Chokdi. Heavy mosquito breeding reported with several dengue cases in neighborhood.",
    summary: "Stagnant wastewater pond causing vector mosquito breeding near Madhapar.",
    createdAt: daysAgo(2, 5),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },

  // ==========================================
  // MAHARASHTRA - MUMBAI & PUNE
  // ==========================================
  {
    userId: USER_PIKACHU,
    submitterName: "Rohan",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Western Express Highway near Gundavali Metro, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400069",
    lat: 19.1176,
    lng: 72.8561,
    deviceLocation: { lat: 19.1176, lng: 72.8561 },
    category: "Roads",
    urgency: 5,
    status: "in progress",
    text: "Series of sharp, deep potholes on south-bound Western Express Highway just after Gundavali Metro. Multiple two-wheeler accidents and heavy traffic congestion reported during peak office hours.",
    summary: "Hazardous potholes causing motorcycle accidents on Western Express Highway.",
    createdAt: hoursAgo(4), // Filed today!
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: hoursAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Sneha",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Dadar West Flower Market, Senapati Bapat Marg",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400028",
    lat: 19.0194,
    lng: 72.8428,
    deviceLocation: { lat: 19.0194, lng: 72.8428 },
    category: "Sanitation/Health",
    urgency: 4,
    status: "registered",
    text: "Decomposing organic waste and floral refuse piled high outside Dadar station west gate. Drains are choked, emitting noxious stench and obstructing commuter access.",
    summary: "Accumulated market waste choking storm drains near Dadar Station west entrance.",
    createdAt: daysAgo(1, 3),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Near Linking Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    lat: 19.0607,
    lng: 72.8362,
    deviceLocation: null,
    category: "Other",
    urgency: 2,
    status: "closed",
    text: "Fallen tree branch hanging precariously over footpath and overhead communication wires following gusty winds. Municipal tree department cleared it.",
    summary: "Precarious broken tree branch removed from Linking Road footpath.",
    createdAt: daysAgo(8),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(5),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Aditya",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Kothrud Depot Chowk, Paud Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411038",
    lat: 18.5074,
    lng: 73.8077,
    deviceLocation: { lat: 18.5074, lng: 73.8077 },
    category: "Electricity",
    urgency: 4,
    status: "in progress",
    text: "Frequent voltage drops and recurring transformer sparks near Kothrud Depot during evening load hours. Multiple residents report blown appliance capacitors.",
    summary: "Sparking distribution transformer and severe voltage fluctuations in Kothrud.",
    createdAt: daysAgo(2, 1),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Priyanka",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Viman Nagar Central Park Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    lat: 18.5679,
    lng: 73.9143,
    deviceLocation: { lat: 18.5679, lng: 73.9143 },
    category: "Water Supply",
    urgency: 3,
    status: "registered",
    text: "Municipal tap water delivered in the morning contains noticeable brown sediment and mud. Water purification filters are getting clogged within two days.",
    summary: "Muddy and turbid municipal tap water supply across Viman Nagar sector.",
    createdAt: daysAgo(3, 7),
    imageUrls: [],
  },

  // ==========================================
  // DELHI / NCR
  // ==========================================
  {
    userId: USER_KAUSHAL_CITIZEN,
    submitterName: "Kaushal",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Connaught Place Outer Circle, Central Delhi",
    city: "Central Delhi",
    state: "Delhi",
    pincode: "110001",
    lat: 28.6328,
    lng: 77.2197,
    deviceLocation: { lat: 28.6328, lng: 77.2197 },
    category: "Roads",
    urgency: 3,
    status: "closed",
    text: "Settled pavement tiles and sunken manhole cover right next to pedestrian zebra crossing outside Block M Outer Circle. Re-leveled by NDMC engineers.",
    summary: "Sunken manhole frame and uneven pavement restored on CP Outer Circle crossing.",
    createdAt: daysAgo(5),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(2),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: "Vikram",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Sector 9 Market, Rohini",
    city: "North West Delhi",
    state: "Delhi",
    pincode: "110085",
    lat: 28.7126,
    lng: 77.1264,
    deviceLocation: null,
    category: "Water Supply",
    urgency: 4,
    status: "registered",
    text: "Contaminated water supply emitting strong sewage-like odor in Sector 9 Rohini blocks C & D for three consecutive days. Residents cannot use it for cooking or drinking.",
    summary: "Contaminated municipal drinking water smelling of sewage in Rohini Sector 9.",
    createdAt: daysAgo(1, 6),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Karol Bagh Metro Station Gate 2, Pusa Road",
    city: "Central Delhi",
    state: "Delhi",
    pincode: "110005",
    lat: 28.6448,
    lng: 77.1906,
    deviceLocation: { lat: 28.6448, lng: 77.1906 },
    category: "Sanitation/Health",
    urgency: 4,
    status: "in progress",
    text: "Massive pile of uncleared construction debris and dry municipal waste choking the main stormwater drain inlet outside Metro Gate 2. Causes immediate waterlogging.",
    summary: "Construction debris choking main stormwater drainage at Karol Bagh Metro.",
    createdAt: daysAgo(2, 8),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Rajesh",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Government Co-Ed Senior Secondary School, Sarita Vihar",
    city: "South East Delhi",
    state: "Delhi",
    pincode: "110076",
    lat: 28.5312,
    lng: 77.2941,
    deviceLocation: null,
    category: "Education",
    urgency: 5,
    status: "registered",
    text: "Toilets in the primary student wing have suffered complete pipeline blockage. With no running water or functioning toilets, over 400 young students are suffering.",
    summary: "Complete failure of sanitation and water facilities at Sarita Vihar government school.",
    createdAt: hoursAgo(2), // Filed today!
    imageUrls: [],
  },

  // ==========================================
  // KARNATAKA - BENGALURU
  // ==========================================
  {
    userId: USER_SHREYA,
    submitterName: "Arun",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "100 Feet Road, HAL 2nd Stage, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    lat: 12.9719,
    lng: 77.6412,
    deviceLocation: { lat: 12.9719, lng: 77.6412 },
    category: "Electricity",
    urgency: 5,
    status: "in progress",
    text: "High-voltage overhead wire snapped and is dangling within 6 feet of the road surface right next to a busy bus stop on 100 Feet Road. BESCOM alerted.",
    summary: "Dangerous low-dangling high-voltage electrical cable near Indiranagar bus stop.",
    createdAt: daysAgo(1, 1),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: hoursAgo(18),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: "Kavya",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near Bellandur Lake Spillway, Outer Ring Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    lat: 12.9260,
    lng: 77.6762,
    deviceLocation: { lat: 12.9260, lng: 77.6762 },
    category: "Sanitation/Health",
    urgency: 4,
    status: "registered",
    text: "Untreated toxic froth spilling over roadway barrier during wind gusts. Strong chemical odor affecting commuters and residents living adjacent to Bellandur.",
    summary: "Chemical froth and foam overflow from Bellandur Lake spilling onto roadway.",
    createdAt: daysAgo(3),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: "Deepak",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Sony World Signal, 80 Feet Road, Koramangala 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    lat: 12.9352,
    lng: 77.6245,
    deviceLocation: null,
    category: "Roads",
    urgency: 3,
    status: "registered",
    text: "Deep transverse trench dug across 80 Feet Road for utility pipe installation has been refilled only with loose mud. Vehicles are bottoming out.",
    summary: "Unsurfaced utility trench causing vehicular damage on Koramangala 80 Feet Road.",
    createdAt: daysAgo(4, 5),
    imageUrls: [],
  },

  // ==========================================
  // TAMIL NADU - CHENNAI
  // ==========================================
  {
    userId: USER_SILVEROAK,
    submitterName: "Karthikeyan",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Usman Road Flyover Base, T. Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
    lat: 13.0418,
    lng: 80.2337,
    deviceLocation: { lat: 13.0418, lng: 80.2337 },
    category: "Roads",
    urgency: 4,
    status: "in progress",
    text: "Substantial road cave-in (approx 4 feet wide) near pillar 8 of Usman Road Flyover following heavy monsoon shower. Traffic police have placed makeshift barriers.",
    summary: "Dangerous road cave-in and sinkhole at Usman Road Flyover junction.",
    createdAt: daysAgo(2, 4),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_SILVEROAK,
    submitterName: "Lakshmi",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Besant Avenue Road, Adyar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600020",
    lat: 13.0067,
    lng: 80.2570,
    deviceLocation: null,
    category: "Water Supply",
    urgency: 3,
    status: "closed",
    text: "Main pipeline leak under pavement near Adyar bus depot. Clean drinking water continuously gushing onto the sidewalk for three days. Repaired by MetroWater.",
    summary: "Potable water pipeline rupture repaired on Adyar pedestrian sidewalk.",
    createdAt: daysAgo(9),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(4),
    imageUrls: [],
  },

  // ==========================================
  // TELANGANA - HYDERABAD
  // ==========================================
  {
    userId: USER_PIKACHU,
    submitterName: "Suresh",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Cyber Towers Junction, Hitec City, Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    lat: 17.4504,
    lng: 78.3808,
    deviceLocation: { lat: 17.4504, lng: 78.3808 },
    category: "Electricity",
    urgency: 3,
    status: "registered",
    text: "Automated traffic signals at Cyber Towers four-way intersection have been stuck on flashing amber for over 36 hours, causing gridlock during evening commute.",
    summary: "Traffic signaling system failure causing traffic jam at Cyber Towers junction.",
    createdAt: daysAgo(1, 5),
    imageUrls: [],
  },
  {
    userId: USER_PIKACHU,
    submitterName: null,
    isAnonymous: true,
    isDuplicateFlag: false,
    location: "Road No. 12, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    lat: 17.4156,
    lng: 78.4347,
    deviceLocation: null,
    category: "Other",
    urgency: 2,
    status: "closed",
    text: "Missing cast iron storm drain grate on pedestrian footpath outside public park. Poses severe danger of falling for night joggers. New grate installed.",
    summary: "Stormwater drain grate replaced on Banjara Hills pedestrian pathway.",
    createdAt: daysAgo(10),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(6),
    imageUrls: [],
  },

  // ==========================================
  // UTTAR PRADESH & RAJASTHAN
  // ==========================================
  {
    userId: USER_SILVEROAK,
    submitterName: "Amit",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "Near Hazratganj Chauraha, Civil Lines",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226001",
    lat: 26.8467,
    lng: 80.9462,
    deviceLocation: { lat: 26.8467, lng: 80.9462 },
    category: "Sanitation/Health",
    urgency: 3,
    status: "in progress",
    text: "Waste collection compactor has not visited Hazratganj market lane for five days. Commercial waste and food packaging overflowing onto road.",
    summary: "Delayed commercial municipal waste collection around Hazratganj market.",
    createdAt: daysAgo(2, 3),
    statusChangedByName: "Kaushal",
    statusChangedByState: "Gujarat",
    statusChangedAt: daysAgo(1),
    imageUrls: [],
  },
  {
    userId: USER_SHREYA,
    submitterName: "Pooja",
    isAnonymous: false,
    isDuplicateFlag: false,
    location: "MI Road near Ajmeri Gate, Pink City",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    lat: 26.9157,
    lng: 75.8185,
    deviceLocation: { lat: 26.9157, lng: 75.8185 },
    category: "Water Supply",
    urgency: 4,
    status: "registered",
    text: "No municipal water supply in walled city zone for past 4 days due to distribution pump breakdown. Public hand pumps are overwhelmed.",
    summary: "Drinking water supply breakdown in Pink City sector around Ajmeri Gate.",
    createdAt: daysAgo(3, 2),
    imageUrls: [],
  },
];

// High quality initial Priority AI Report synthesized from this exact dataset
const INITIAL_PRIORITY_REPORT = [
  {
    rank: 1,
    title: "Immediate Electrical Safety Hazard Rectification & Power Line Repair",
    reasoning: "Urgency 5 live electrical feeder exposure in Thaltej (Ahmedabad) and dangling high-voltage lines in Indiranagar (Bengaluru) pose imminent electrocution hazards to pedestrians.",
    relatedCategory: "Electricity",
    affectedArea: "Gujarat & Karnataka"
  },
  {
    rank: 2,
    title: "Critical School Sanitation & Infrastructure Restoration Initiative",
    reasoning: "Multiple primary and secondary schools in Sarita Vihar (Delhi), Naroda (Ahmedabad), and Sayajiganj (Vadodara) report complete sanitation pipeline failures and boundary wall collapses endangering students.",
    relatedCategory: "Education",
    affectedArea: "Delhi & Gujarat"
  },
  {
    rank: 3,
    title: "Monsoon Waterlogging & Arterial Road Surface Rehabilitation",
    reasoning: "High-density road complaints along Shela corridor (Ahmedabad), Western Express Highway (Mumbai), and M.P. Shah College (Surendra Nagar) are creating transit bottlenecks and traffic accidents.",
    relatedCategory: "Roads",
    affectedArea: "Gujarat & Maharashtra"
  },
  {
    rank: 4,
    title: "Drinking Water Pipeline Network Overhaul & Contamination Response",
    reasoning: "Severe water contamination in Rohini (Delhi) and pipeline ruptures causing water outages in Joravarnagar (Surendra Nagar) and Pink City (Jaipur) require urgent pipeline flushing and valve replacements.",
    relatedCategory: "Water Supply",
    affectedArea: "Delhi, Gujarat & Rajasthan"
  },
  {
    rank: 5,
    title: "Urban Drainage Desilting & Vector-Borne Disease Mitigation Drive",
    reasoning: "Sewer overflows near Vastrapur Lake (Ahmedabad) and stagnant open wastewater breeding pools in Madhapar (Rajkot) and Dadar (Mumbai) present immediate public health and dengue escalation risks.",
    relatedCategory: "Sanitation/Health",
    affectedArea: "Gujarat & Maharashtra"
  }
];

async function main() {
  console.log("=== InfraAlign Data Reset & Seeding Script ===");

  // 1. Verify User Accounts are preserved
  console.log("\n[1/5] Checking user accounts (WILL NOT DELETE)...");
  const usersSnap = await adminDb.collection("users").get();
  console.log(`Found ${usersSnap.size} existing user documents in Firestore.`);
  usersSnap.forEach((doc) => {
    const d = doc.data();
    console.log(` - User ID ${doc.id}: ${d.email} (${d.role}) - ${d.firstName} ${d.lastName}`);
  });

  // Ensure user profiles exist for all 5 Auth accounts so team members have working profiles
  const profilesToEnsure = [
    {
      uid: USER_SHREYA,
      data: {
        firstName: "Shreya",
        lastName: "Raval",
        email: "ravalshreya.2004@gmail.com",
        role: "citizen",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
        createdAt: FieldValue.serverTimestamp(),
      },
    },
    {
      uid: USER_SILVEROAK,
      data: {
        firstName: "SilverOak",
        lastName: "Campus",
        email: "2202031800034@silveroakuni.ac.in",
        role: "citizen",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "382481",
        createdAt: FieldValue.serverTimestamp(),
      },
    },
    {
      uid: USER_PIKACHU,
      data: {
        firstName: "Pooja",
        lastName: "Patel",
        email: "pikachuu.3002@gmail.com",
        role: "citizen",
        city: "Surendra Nagar",
        state: "Gujarat",
        pincode: "363020",
        createdAt: FieldValue.serverTimestamp(),
      },
    },
  ];

  for (const prof of profilesToEnsure) {
    const userDocRef = adminDb.collection("users").doc(prof.uid);
    const existing = await userDocRef.get();
    if (!existing.exists) {
      await userDocRef.set(prof.data);
      console.log(` + Initialized profile document for auth user ${prof.data.email}`);
    }
  }

  // 2. Clear old complaints
  console.log("\n[2/5] Resetting 'complaints' collection...");
  const oldComplaints = await adminDb.collection("complaints").get();
  console.log(`Found ${oldComplaints.size} existing complaint documents to remove.`);
  const deleteBatch = adminDb.batch();
  oldComplaints.forEach((doc) => {
    deleteBatch.delete(doc.ref);
  });
  if (oldComplaints.size > 0) {
    await deleteBatch.commit();
    console.log("Successfully removed old complaints.");
  } else {
    console.log("No old complaints to remove.");
  }

  // 3. Clear rateLimits collection
  console.log("\n[3/5] Cleaning 'rateLimits' collection...");
  const rateLimits = await adminDb.collection("rateLimits").get();
  if (rateLimits.size > 0) {
    const rlBatch = adminDb.batch();
    rateLimits.forEach((doc) => rlBatch.delete(doc.ref));
    await rlBatch.commit();
    console.log(`Cleared ${rateLimits.size} rate limit documents.`);
  } else {
    console.log("No rate limit documents found.");
  }

  // 4. Feed proper initial complaints data
  console.log(`\n[4/5] Feeding ${SEED_COMPLAINTS.length} proper initial complaints...`);
  // Firestore batches support up to 500 operations
  const insertBatch = adminDb.batch();
  for (const c of SEED_COMPLAINTS) {
    const newRef = adminDb.collection("complaints").doc();
    insertBatch.set(newRef, c);
  }
  await insertBatch.commit();
  console.log(`Successfully seeded ${SEED_COMPLAINTS.length} realistic complaints across India!`);

  // 5. Initialize Priority Reports
  console.log("\n[5/5] Updating Priority AI Report cache ('priorityReports/latest')...");
  await adminDb.collection("priorityReports").doc("latest").set({
    report: INITIAL_PRIORITY_REPORT,
    generatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Successfully updated priorityReports/latest with synthesized recommendations.");

  console.log("\n=== Data reset and seeding completed successfully! ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error during reset & seed:", err);
    process.exit(1);
  });
