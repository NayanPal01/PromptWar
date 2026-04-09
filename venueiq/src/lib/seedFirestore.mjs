/**
 * Firestore Data Seeder — VenueIQ
 * 
 * Run this ONCE to populate Firestore with initial venue data.
 * Collections: gates, foodStalls, restrooms, zones, venueStats
 * 
 * Usage: node src/lib/seedFirestore.mjs
 * (Requires running from venueiq directory with .env.local available)
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfJu3ozPePfpEKm5bb9H8c8ak1N1hv75E",
  authDomain: "venueiq-355b3.firebaseapp.com",
  projectId: "venueiq-355b3",
  storageBucket: "venueiq-355b3.firebasestorage.app",
  messagingSenderId: "88825829128",
  appId: "1:88825829128:web:782360cb7b679990b37ebd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("🌱 Seeding Firestore...\n");

  // ===== GATES =====
  const gates = [
    { id: "gate_A", name: "Gate A", crowd: 0.3, waitMin: 5, section: "North", recommended: true },
    { id: "gate_B", name: "Gate B", crowd: 0.7, waitMin: 15, section: "East", recommended: false },
    { id: "gate_C", name: "Gate C", crowd: 0.5, waitMin: 10, section: "South", recommended: false },
    { id: "gate_D", name: "Gate D", crowd: 0.9, waitMin: 25, section: "West", recommended: false },
    { id: "gate_E", name: "Gate E", crowd: 0.2, waitMin: 3, section: "North-East", recommended: true },
  ];

  for (const gate of gates) {
    await setDoc(doc(db, "gates", gate.id), {
      name: gate.name,
      crowd: gate.crowd,
      waitMin: gate.waitMin,
      section: gate.section,
      recommended: gate.recommended,
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Gate: ${gate.name}`);
  }

  // ===== FOOD STALLS =====
  const foodStalls = [
    { id: "stall_1", name: "Samosa Central", queue: 12, avgService: 45, counters: 3, icon: "🥟", category: "snacks" },
    { id: "stall_2", name: "Biryani House", queue: 8, avgService: 90, counters: 2, icon: "🍚", category: "meals" },
    { id: "stall_3", name: "Pizza Corner", queue: 5, avgService: 60, counters: 2, icon: "🍕", category: "snacks" },
    { id: "stall_4", name: "Chai Point", queue: 18, avgService: 30, counters: 4, icon: "☕", category: "beverages" },
    { id: "stall_5", name: "Juice Bar", queue: 3, avgService: 40, counters: 1, icon: "🥤", category: "beverages" },
    { id: "stall_6", name: "Dosa Express", queue: 7, avgService: 50, counters: 2, icon: "🫓", category: "meals" },
    { id: "stall_7", name: "Ice Cream Parlor", queue: 10, avgService: 25, counters: 2, icon: "🍦", category: "desserts" },
  ];

  for (const stall of foodStalls) {
    await setDoc(doc(db, "foodStalls", stall.id), {
      name: stall.name,
      queue: stall.queue,
      avgService: stall.avgService,
      counters: stall.counters,
      icon: stall.icon,
      category: stall.category,
      type: "food",
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Food Stall: ${stall.name}`);
  }

  // ===== RESTROOMS =====
  const restrooms = [
    { id: "restroom_1", name: "Restroom A (North)", queue: 6, avgService: 120, counters: 8, accessible: true, zone: "North" },
    { id: "restroom_2", name: "Restroom B (East)", queue: 14, avgService: 120, counters: 6, accessible: false, zone: "East" },
    { id: "restroom_3", name: "Restroom C (South)", queue: 2, avgService: 120, counters: 10, accessible: true, zone: "South" },
    { id: "restroom_4", name: "Restroom D (West)", queue: 9, avgService: 120, counters: 5, accessible: false, zone: "West" },
    { id: "restroom_5", name: "Restroom E (VIP)", queue: 1, avgService: 120, counters: 4, accessible: true, zone: "VIP" },
  ];

  for (const room of restrooms) {
    await setDoc(doc(db, "restrooms", room.id), {
      name: room.name,
      queue: room.queue,
      avgService: room.avgService,
      counters: room.counters,
      accessible: room.accessible,
      zone: room.zone,
      icon: "🚻",
      type: "restroom",
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Restroom: ${room.name}`);
  }

  // ===== ZONES (for staff heatmap) =====
  const zones = [
    { id: "zone_A", name: "North Stand", capacity: 12000, current: 9800, density: 0.82, densityChange: 0.05 },
    { id: "zone_B", name: "East Wing", capacity: 8000, current: 7500, density: 0.94, densityChange: 0.35 },
    { id: "zone_C", name: "South Stand", capacity: 15000, current: 8200, density: 0.55, densityChange: -0.02 },
    { id: "zone_D", name: "West Wing", capacity: 10000, current: 8900, density: 0.89, densityChange: 0.12 },
    { id: "zone_E", name: "VIP Lounge", capacity: 2000, current: 1100, density: 0.55, densityChange: 0.01 },
    { id: "zone_F", name: "Food Court", capacity: 5000, current: 4200, density: 0.84, densityChange: 0.22 },
  ];

  for (const zone of zones) {
    await setDoc(doc(db, "zones", zone.id), {
      name: zone.name,
      capacity: zone.capacity,
      current: zone.current,
      density: zone.density,
      densityChange: zone.densityChange,
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Zone: ${zone.name}`);
  }

  // ===== VENUE STATS (single document) =====
  await setDoc(doc(db, "venueStats", "live"), {
    totalAttendees: 34567,
    avgWaitTime: 8,
    activeAlerts: 3,
    crowdDensity: 72,
    eventName: "IPL 2026 — MI vs CSK",
    eventDate: "2026-04-09",
    venueCapacity: 52000,
    updatedAt: serverTimestamp(),
  });
  console.log("  ✅ Venue Stats: live");

  // ===== STAFF MEMBERS =====
  const staffMembers = [
    { id: "staff_1", name: "Rajesh K.", role: "Security Lead", status: "busy", zone: "East Wing" },
    { id: "staff_2", name: "Priya M.", role: "Medical", status: "busy", zone: "East Wing" },
    { id: "staff_3", name: "Amit S.", role: "Security", status: "available", zone: "North Stand" },
    { id: "staff_4", name: "Sneha R.", role: "Operations", status: "available", zone: "South Stand" },
    { id: "staff_5", name: "Vikram P.", role: "Security", status: "available", zone: "West Wing" },
    { id: "staff_6", name: "Neha T.", role: "Medical", status: "offline", zone: "-" },
  ];

  for (const member of staffMembers) {
    await setDoc(doc(db, "staffMembers", member.id), {
      name: member.name,
      role: member.role,
      status: member.status,
      zone: member.zone,
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Staff: ${member.name}`);
  }

  // ===== SAMPLE ALERTS =====
  const alerts = [
    { id: "alert_1", type: "sos", severity: "urgent", title: "Medical Emergency — Section D, Row 14", zone: "West Wing", status: "active", assignedTo: null },
    { id: "alert_2", type: "anomaly", severity: "warning", title: "Crowd surge detected in East Wing (+35%)", zone: "East Wing", status: "active", assignedTo: "Rajesh K." },
    { id: "alert_3", type: "sos", severity: "urgent", title: "Lost child reported near Gate B", zone: "East Wing", status: "dispatched", assignedTo: "Priya M." },
    { id: "alert_4", type: "system", severity: "info", title: "Food Court queue exceeding 20 min wait", zone: "Food Court", status: "active", assignedTo: null },
  ];

  for (const alert of alerts) {
    await setDoc(doc(db, "alerts", alert.id), {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      zone: alert.zone,
      status: alert.status,
      assignedTo: alert.assignedTo,
      createdAt: serverTimestamp(),
    });
    console.log(`  ✅ Alert: ${alert.title.substring(0, 40)}...`);
  }

  console.log("\n🎉 Firestore seeded successfully!");
  console.log("   Collections created: gates, foodStalls, restrooms, zones, venueStats, staffMembers, alerts");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
