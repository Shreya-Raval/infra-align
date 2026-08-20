import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request) {
  try {
    const { complaintId, location } = await request.json();

    if (!complaintId || !location) {
      return Response.json(
        { error: "complaintId and location are required" },
        { status: 400 }
      );
    }

    let lat = null;
    let lng = null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        location
      )}&format=json&limit=1`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "CivicComplaintTracker/1.0 (hackathon project)",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const firstResult = data[0];
          lat = Number(firstResult.lat);
          lng = Number(firstResult.lon);
        } else {
          console.warn(`No geocoding results found for location: "${location}"`);
        }
      } else {
        console.warn(
          `Nominatim fetch failed with status ${res.status} for location: "${location}"`
        );
      }
    } catch (fetchErr) {
      console.warn(
        `Failed to geocode location "${location}":`,
        fetchErr?.message || fetchErr
      );
    }

    await adminDb.collection("complaints").doc(complaintId).update({
      lat,
      lng,
    });

    return Response.json({ success: true, lat, lng });
  } catch (error) {
    console.error("Geocoding error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
