/**
 * Gemini AI Service — VenueIQ
 * 
 * Uses Google Gemini API to:
 * 1. Auto-generate venue architecture from venue name
 * 2. Search online for real venue details (gates, zones, capacity)
 * 3. Generate intelligent venue configurations
 * 
 * Requires: NEXT_PUBLIC_GEMINI_API_KEY in .env.local
 */

// Read key lazily at call time, not module load time
function getApiKey() {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
}

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

async function callGemini(prompt, maxTokens = 2000) {
  const key = getApiKey();
  if (!key) return null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini model ${model} failed (${response.status}):`, errText);
        continue; // try next model
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`✅ Gemini ${model} responded successfully`);
        return text;
      }
    } catch (err) {
      console.warn(`Gemini model ${model} error:`, err.message);
      continue;
    }
  }
  return null; // all models failed
}

/**
 * Generate venue configuration from venue name using Gemini AI.
 * Returns structured JSON with gates, zones, stalls, capacity info.
 */
export async function generateVenueConfig(venueName, eventName, expectedAttendees) {
  const key = getApiKey();
  if (!key) {
    console.warn("No Gemini API key — using fallback config");
    return generateFallbackConfig(venueName, expectedAttendees);
  }

  const prompt = `You are a venue architecture expert. Given a real venue, generate a JSON configuration for a crowd management system.

Venue: "${venueName}"
Event: "${eventName}"
Expected Attendees: ${expectedAttendees || "unknown"}

IMPORTANT: Search your knowledge for the REAL venue. If it's a famous venue (like Eden Gardens Kolkata, Wankhede Stadium Mumbai, Madison Square Garden, etc.), use the ACTUAL gate names, actual capacity, actual zone names, and real layout information.

If the venue is not well-known, generate a realistic configuration based on the type of venue.

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "venueDescription": "Brief real description of the venue (2-3 sentences)",
  "totalCapacity": number,
  "venueType": "stadium" | "auditorium" | "concert" | "arena",
  "diagram": "Valid Mermaid.js graph TD string showing the flow from Gates -> Zones/Stands. Do NOT use markdown code blocks in this string, just raw mermaid syntax starting with 'graph TD'.",
  "gates": [
    { "name": "Gate Name", "section": "Section/Direction", "estimatedCapacityFlow": number }
  ],
  "zones": [
    { "name": "Zone/Stand Name", "capacity": number, "description": "Brief description" }
  ],
  "restrooms": [
    { "name": "Restroom Name", "type": "restroom", "counters": number, "accessible": boolean, "icon": "🚻" }
  ],
  "emergencyExits": number,
  "parkingCapacity": number
}

Be realistic. Use actual data when available. Include 3-8 gates, 4-8 zones, 2-4 restrooms. Include a Mermaid diagram string mapping the gates to the major zones.`;

  try {
    const text = await callGemini(prompt, 4000);
    
    if (!text) {
      console.warn("All Gemini models failed — using fallback");
      return generateFallbackConfig(venueName, expectedAttendees);
    }

    // Clean up the response — remove markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const config = JSON.parse(cleaned);
      console.log("✅ AI venue config generated:", config.venueDescription);
      return config;
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", parseErr, "Raw:", cleaned.substring(0, 200));
      return generateFallbackConfig(venueName, expectedAttendees);
    }
  } catch (err) {
    console.error("Gemini request failed:", err);
    return generateFallbackConfig(venueName, expectedAttendees);
  }
}

/**
 * Search for venue image using Gemini (returns a description for now).
 * In production, you'd use Google Custom Search API for actual images.
 */
export async function getVenueDescription(venueName) {
  const key = getApiKey();
  if (!key) return null;

  try {
    const text = await callGemini(
      `Describe the venue "${venueName}" in 2-3 sentences. Include its location, capacity, and notable features. If it's a real famous venue, provide accurate details. If unknown, say "Custom venue".`,
      200
    );
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Fallback config when Gemini is unavailable.
 * Generates a reasonable config based on venue name keywords.
 */
function generateFallbackConfig(venueName, expectedAttendees) {
  const name = (venueName || "").toLowerCase();
  const capacity = parseInt(expectedAttendees) || 5000;
  
  // Detect venue type from name
  let venueType = "stadium";
  if (name.includes("auditorium") || name.includes("hall") || name.includes("theater") || name.includes("theatre")) {
    venueType = "auditorium";
  } else if (name.includes("concert") || name.includes("arena") || name.includes("ground")) {
    venueType = "concert";
  }

  const configs = {
    stadium: {
      venueDescription: `${venueName} — a venue configured for large-scale events.`,
      totalCapacity: capacity,
      venueType: "stadium",
      gates: [
        { name: "Main Gate", section: "North", estimatedCapacityFlow: Math.round(capacity * 0.3) },
        { name: "Gate 2", section: "East", estimatedCapacityFlow: Math.round(capacity * 0.2) },
        { name: "Gate 3", section: "South", estimatedCapacityFlow: Math.round(capacity * 0.25) },
        { name: "Gate 4", section: "West", estimatedCapacityFlow: Math.round(capacity * 0.15) },
        { name: "VIP Gate", section: "North-East", estimatedCapacityFlow: Math.round(capacity * 0.1) },
      ],
      zones: [
        { name: "North Stand", capacity: Math.round(capacity * 0.25) },
        { name: "East Stand", capacity: Math.round(capacity * 0.2) },
        { name: "South Stand", capacity: Math.round(capacity * 0.25) },
        { name: "West Stand", capacity: Math.round(capacity * 0.2) },
        { name: "VIP Enclosure", capacity: Math.round(capacity * 0.05) },
        { name: "General Area", capacity: Math.round(capacity * 0.05) },
      ],
      restrooms: [
        { name: "Restroom Block A", type: "restroom", counters: 10, accessible: true, icon: "🚻" },
        { name: "Restroom Block B", type: "restroom", counters: 8, accessible: false, icon: "🚻" },
        { name: "Restroom Block C", type: "restroom", counters: 8, accessible: true, icon: "🚻" },
      ],
    },
    auditorium: {
      venueDescription: `${venueName} — an indoor auditorium/hall venue.`,
      totalCapacity: capacity,
      venueType: "auditorium",
      gates: [
        { name: "Main Entrance", section: "Front", estimatedCapacityFlow: Math.round(capacity * 0.5) },
        { name: "Side Entrance Left", section: "Left", estimatedCapacityFlow: Math.round(capacity * 0.25) },
        { name: "Side Entrance Right", section: "Right", estimatedCapacityFlow: Math.round(capacity * 0.25) },
      ],
      zones: [
        { name: "Front Section", capacity: Math.round(capacity * 0.2) },
        { name: "Middle Section", capacity: Math.round(capacity * 0.4) },
        { name: "Rear Section", capacity: Math.round(capacity * 0.25) },
        { name: "Balcony", capacity: Math.round(capacity * 0.15) },
      ],
      restrooms: [
        { name: "Ground Floor Restroom", type: "restroom", counters: 6, accessible: true, icon: "🚻" },
        { name: "Upper Floor Restroom", type: "restroom", counters: 4, accessible: false, icon: "🚻" },
      ],
    },
    concert: {
      venueDescription: `${venueName} — an open-air/concert venue.`,
      totalCapacity: capacity,
      venueType: "concert",
      gates: [
        { name: "Main Entry", section: "South", estimatedCapacityFlow: Math.round(capacity * 0.4) },
        { name: "East Entry", section: "East", estimatedCapacityFlow: Math.round(capacity * 0.3) },
        { name: "VIP Entry", section: "North", estimatedCapacityFlow: Math.round(capacity * 0.15) },
        { name: "West Entry", section: "West", estimatedCapacityFlow: Math.round(capacity * 0.15) },
      ],
      zones: [
        { name: "Pit/Front Area", capacity: Math.round(capacity * 0.2) },
        { name: "General Standing", capacity: Math.round(capacity * 0.4) },
        { name: "VIP Area", capacity: Math.round(capacity * 0.1) },
        { name: "Lawn/Back Area", capacity: Math.round(capacity * 0.3) },
      ],
      restrooms: [
        { name: "Portable Restrooms A", type: "restroom", counters: 8, accessible: true, icon: "🚻" },
        { name: "Portable Restrooms B", type: "restroom", counters: 6, accessible: false, icon: "🚻" },
      ],
    },
  };

  return configs[venueType] || configs.stadium;
}
