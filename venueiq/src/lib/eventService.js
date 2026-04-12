/**
 * Event Service — VenueIQ
 * 
 * Multi-event system: all venue data lives under events/{eventId}/
 * Supports: create event from template, join event, real-time listeners scoped to event
 * 
 * Firestore structure:
 *   events/{eventId}           → event metadata
 *   events/{eventId}/gates     → gate subcollection
 *   events/{eventId}/zones     → zone subcollection
 *   events/{eventId}/stalls    → food stalls + restrooms
 *   events/{eventId}/alerts    → SOS + anomaly alerts
 *   events/{eventId}/staff     → staff members
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import { VENUE_TEMPLATES } from "./venueTemplates";

// ===================================================
// EVENT CRUD
// ===================================================

/**
 * Create event from AI-generated venue config.
 * ALL COUNTERS START AT 0 — no fake data.
 * Real data comes only from attendee check-ins.
 * 
 * @param {Object} params
 * @param {Object} params.aiConfig - AI-generated venue configuration from geminiService
 */
export async function createEvent({ hostId, eventName, venueName, date, expectedAttendees, template, aiConfig }) {
  const eventRef = doc(collection(db, "events"));
  const eventId = eventRef.id;

  // Determine venue type for map template
  const venueType = aiConfig?.venueType || template || "stadium";

  await setDoc(eventRef, {
    eventName,
    venueName,
    date,
    expectedAttendees: parseInt(expectedAttendees) || 0,
    template: venueType,
    hostId,
    ticketCode: generateTicketCode(),
    venueDescription: aiConfig?.venueDescription || "",
    totalCapacity: aiConfig?.totalCapacity || parseInt(expectedAttendees) || 0,
    emergencyExits: aiConfig?.emergencyExits || 0,
    parkingCapacity: aiConfig?.parkingCapacity || 0,
    status: "active",
    createdAt: serverTimestamp(),
  });

  // Use AI config if available, otherwise use template defaults
  const gates = aiConfig?.gates || VENUE_TEMPLATES[venueType]?.defaultGates || [];
  const zones = aiConfig?.zones || VENUE_TEMPLATES[venueType]?.defaultZones || [];
  const foodStalls = aiConfig?.foodStalls || [];
  const restrooms = aiConfig?.restrooms || [];

  // Populate gates — ALL START AT 0 (real data only from check-ins)
  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    await setDoc(doc(db, "events", eventId, "gates", `gate_${i}`), {
      name: gate.name,
      section: gate.section || "",
      estimatedCapacityFlow: gate.estimatedCapacityFlow || 0,
      currentCount: 0,    // REAL: starts at 0, incremented by check-ins
      crowd: 0,           // REAL: 0 until people check in
      waitMin: 0,         // REAL: 0 until queue forms
      recommended: false,
      updatedAt: serverTimestamp(),
    });
  }

  // Populate zones — ALL START AT 0
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    await setDoc(doc(db, "events", eventId, "zones", `zone_${i}`), {
      name: zone.name,
      description: zone.description || "",
      capacity: zone.capacity || 0,
      current: 0,          // REAL: 0 until check-ins
      density: 0,          // REAL: 0 until people arrive
      densityChange: 0,
      updatedAt: serverTimestamp(),
    });
  }

  // Populate food stalls — queues start at 0
  for (let i = 0; i < foodStalls.length; i++) {
    const stall = foodStalls[i];
    await setDoc(doc(db, "events", eventId, "stalls", `food_${i}`), {
      name: stall.name,
      type: "food",
      category: stall.category || "snacks",
      avgService: stall.avgServiceTimeSec || 60,
      counters: stall.counters || 1,
      icon: stall.icon || "🍽️",
      queue: 0,           // REAL: starts at 0
      updatedAt: serverTimestamp(),
    });
  }

  // Populate restrooms — queues start at 0
  for (let i = 0; i < restrooms.length; i++) {
    const room = restrooms[i];
    await setDoc(doc(db, "events", eventId, "stalls", `restroom_${i}`), {
      name: room.name,
      type: "restroom",
      category: "restroom",
      avgService: 120,
      counters: room.counters || 4,
      icon: "🚻",
      accessible: room.accessible || false,
      queue: 0,           // REAL: starts at 0
      updatedAt: serverTimestamp(),
    });
  }

  // Create live stats doc — ALL ZEROS
  await setDoc(doc(db, "events", eventId, "stats", "live"), {
    totalAttendees: 0,
    avgWaitTime: 0,
    activeAlerts: 0,
    crowdDensity: 0,
    updatedAt: serverTimestamp(),
  });

  return eventId;
}

/** Get event details */
export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** List all active events */
export async function listEvents() {
  const q = query(collection(db, "events"), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** List events for a specific host */
export async function listHostEvents(hostId) {
  const q = query(collection(db, "events"), where("hostId", "==", hostId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Join an event (add user to event's attendee list) */
export async function joinEvent(userId, eventId, ticketCode) {
  const event = await getEvent(eventId);
  if (!event) throw new Error("Event not found");
  if (event.ticketCode && ticketCode !== event.ticketCode) {
    throw new Error("Invalid ticket code");
  }
  // Add event to user's events list
  await updateDoc(doc(db, "users", userId), {
    events: arrayUnion(eventId),
  });
  return event;
}

/** Check if user has access to event */
export async function checkEventAccess(userId, eventId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();
    // Host always has access
    const event = await getEvent(eventId);
    if (event?.hostId === userId) return true;
    // Check if user joined this event
    return userData.events?.includes(eventId) || false;
  } catch {
    return false;
  }
}

// ===================================================
// REAL-TIME LISTENERS (scoped to event)
// ===================================================

export function onEventGatesSnapshot(eventId, callback) {
  return onSnapshot(collection(db, "events", eventId, "gates"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function onEventZonesSnapshot(eventId, callback) {
  return onSnapshot(collection(db, "events", eventId, "zones"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function onEventStallsSnapshot(eventId, callback) {
  return onSnapshot(collection(db, "events", eventId, "stalls"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}


export function onEventStaffSnapshot(eventId, callback) {
  return onSnapshot(collection(db, "events", eventId, "staff"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function onEventStatsSnapshot(eventId, callback) {
  return onSnapshot(doc(db, "events", eventId, "stats", "live"), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// ===================================================
// WRITE OPERATIONS (scoped to event)
// ===================================================

/** Create SOS alert for an event */
export async function createEventAlert(eventId, { type, userId, userName, zone }) {
  return addDoc(collection(db, "events", eventId, "alerts"), {
    type: "sos",
    severity: "urgent",
    title: `${type === "medical" ? "🏥 Medical" : type === "safety" ? "🚨 Safety" : type === "fire" ? "🔥 Fire" : "👶 Lost Person"} — reported by ${userName || "Attendee"}`,
    zone: zone || "Unknown",
    status: "active",
    assignedTo: null,
    reportedBy: userId || null,
    sosType: type,
    createdAt: serverTimestamp(),
  });
}

/** Assign staff to alert */
export async function assignEventStaff(eventId, alertId, staffName) {
  return updateDoc(doc(db, "events", eventId, "alerts", alertId), {
    assignedTo: staffName,
    status: "dispatched",
    updatedAt: serverTimestamp(),
  });
}

/** Resolve alert */
export async function resolveEventAlert(eventId, alertId) {
  return updateDoc(doc(db, "events", eventId, "alerts", alertId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
  });
}

/** Update gate data (for host or simulation) */
export async function updateEventGate(eventId, gateId, data) {
  return updateDoc(doc(db, "events", eventId, "gates", gateId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update stall data */
export async function updateEventStall(eventId, stallId, data) {
  return updateDoc(doc(db, "events", eventId, "stalls", stallId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Add a custom gate to an event */
export async function addEventGate(eventId, gateData) {
  return addDoc(collection(db, "events", eventId, "gates"), {
    ...gateData,
    crowd: 0,
    waitMin: 0,
    recommended: false,
    updatedAt: serverTimestamp(),
  });
}

/** Add a custom stall to an event */
export async function addEventStall(eventId, stallData) {
  return addDoc(collection(db, "events", eventId, "stalls"), {
    ...stallData,
    queue: 0,
    updatedAt: serverTimestamp(),
  });
}

/** Add a custom zone to an event */
export async function addEventZone(eventId, zoneData) {
  return addDoc(collection(db, "events", eventId, "zones"), {
    ...zoneData,
    current: 0,
    density: 0,
    densityChange: 0,
    updatedAt: serverTimestamp(),
  });
}

// ===================================================
// ORDER SYSTEM (Food Counter Staff Portal)
// ===================================================

/** Create a food order (called by attendee) */
export async function createOrder(eventId, stallId, { userId, userName, items, notes }) {
  const orderRef = await addDoc(collection(db, "events", eventId, "orders"), {
    stallId,
    userId,
    userName: userName || "Guest",
    items: items || [],
    notes: notes || "",
    status: "queued", // queued → preparing → ready → collected
    orderId: generateOrderId(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Auto-increment stall queue count
  const stallRef = doc(db, "events", eventId, "stalls", stallId);
  const stallSnap = await getDoc(stallRef);
  if (stallSnap.exists()) {
    const currentQueue = stallSnap.data().queue || 0;
    await updateDoc(stallRef, { queue: currentQueue + 1, updatedAt: serverTimestamp() });
  }
  return orderRef.id;
}

/** Update order status (called by counter staff) */
export async function updateOrderStatus(eventId, orderId, newStatus) {
  const orderRef = doc(db, "events", eventId, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus, updatedAt: serverTimestamp() });
  
  // If collected/ready, decrement queue
  if (newStatus === "collected" || newStatus === "cancelled") {
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const stallId = orderSnap.data().stallId;
      const stallRef = doc(db, "events", eventId, "stalls", stallId);
      const stallSnap = await getDoc(stallRef);
      if (stallSnap.exists()) {
        const currentQueue = Math.max(0, (stallSnap.data().queue || 1) - 1);
        await updateDoc(stallRef, { queue: currentQueue, updatedAt: serverTimestamp() });
      }
    }
  }
}

/** Listen to all orders for an event */
export function onOrdersSnapshot(eventId, callback) {
  return onSnapshot(
    query(collection(db, "events", eventId, "orders"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

/** Listen to orders for a specific stall */
export function onStallOrdersSnapshot(eventId, stallId, callback) {
  return onSnapshot(
    query(collection(db, "events", eventId, "orders"), where("stallId", "==", stallId), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

/** Get a specific stall */
export async function getStall(eventId, stallId) {
  const snap = await getDoc(doc(db, "events", eventId, "stalls", stallId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ===================================================
// DELETE EVENT
// ===================================================

/** Delete an event and all its subcollections */
export async function deleteEvent(eventId) {
  // Delete subcollections first
  const subcols = ["gates", "stalls", "zones", "alerts", "orders", "checkins"];
  for (const sub of subcols) {
    const snap = await getDocs(collection(db, "events", eventId, sub));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, "events", eventId, sub, d.id));
    }
  }
  // Delete stats doc
  try { await deleteDoc(doc(db, "events", eventId, "stats", "live")); } catch {}
  // Delete event doc
  await deleteDoc(doc(db, "events", eventId));
}

// ===================================================
// EMERGENCY ALERTS LISTENER
// ===================================================

/** Listen to active alerts for an event (for host emergency panel) */
export function onEventAlertsSnapshot(eventId, callback) {
  return onSnapshot(
    query(collection(db, "events", eventId, "alerts"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ===================================================
// HELPERS
// ===================================================

function generateTicketCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateOrderId() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `VIQ-${num}`;
}
