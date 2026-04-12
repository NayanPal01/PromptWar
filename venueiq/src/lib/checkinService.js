/**
 * Check-In Service — VenueIQ
 * 
 * THIS IS HOW WE GET REAL-TIME CROWD DATA.
 * 
 * When an attendee arrives at the venue:
 * 1. They open the dashboard and click "Check In" at a specific gate
 * 2. This increments the gate's real crowd counter
 * 3. Updates the zone's current attendee count
 * 4. Updates overall venue stats
 * 5. Records the check-in in the attendee list
 * 
 * Host/Staff can see:
 * - Which gate has how many people (real data)
 * - Total checked-in attendees
 * - Live crowd distribution
 * 
 * Firestore writes:
 * - events/{eventId}/gates/{gateId} → crowd count
 * - events/{eventId}/checkins/{checkinId} → individual record
 * - events/{eventId}/stats/live → total counts
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Check in an attendee at a specific gate.
 * This is the core mechanism for real-time crowd tracking.
 */
export async function checkInAtGate(eventId, gateId, gateName, userId, userName) {
  // 1. Record the check-in
  const checkinRef = await addDoc(collection(db, "events", eventId, "checkins"), {
    userId,
    userName: userName || "Attendee",
    gateId,
    gateName: gateName || "Unknown Gate",
    checkedInAt: serverTimestamp(),
    status: "inside", // inside | exited
  });

  // 2. Increment gate crowd counter
  const gateRef = doc(db, "events", eventId, "gates", gateId);
  const gateSnap = await getDoc(gateRef);
  if (gateSnap.exists()) {
    const currentCrowd = gateSnap.data().currentCount || 0;
    const capacity = gateSnap.data().estimatedCapacityFlow || 1000;
    await updateDoc(gateRef, {
      currentCount: increment(1),
      crowd: Math.min((currentCrowd + 1) / capacity, 1), // crowd ratio 0-1
      waitMin: Math.max(0, Math.round(((currentCrowd + 1) / capacity) * 15)), // estimated wait
      updatedAt: serverTimestamp(),
    });
  }

  // 3. Update overall stats
  const statsRef = doc(db, "events", eventId, "stats", "live");
  await updateDoc(statsRef, {
    totalAttendees: increment(1),
    updatedAt: serverTimestamp(),
  });

  return checkinRef.id;
}

/**
 * Check if user is already checked in to this event.
 */
export async function isCheckedIn(eventId, userId) {
  const q = query(
    collection(db, "events", eventId, "checkins"),
    where("userId", "==", userId),
    where("status", "==", "inside")
  );
  const snap = await getDocs(q);
  return snap.size > 0;
}

/**
 * Get check-in details for a user.
 */
export async function getUserCheckin(eventId, userId) {
  const q = query(
    collection(db, "events", eventId, "checkins"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Listen to all check-ins for an event (for host/staff).
 */
export function onCheckinsSnapshot(eventId, callback) {
  return onSnapshot(
    collection(db, "events", eventId, "checkins"),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
  );
}

/**
 * Get total checked-in count per gate.
 */
export async function getGateCheckinCounts(eventId) {
  const snap = await getDocs(
    query(
      collection(db, "events", eventId, "checkins"),
      where("status", "==", "inside")
    )
  );
  
  const counts = {};
  snap.docs.forEach(d => {
    const data = d.data();
    counts[data.gateId] = (counts[data.gateId] || 0) + 1;
  });
  return counts;
}

/**
 * Mark attendee as exited (checkout).
 */
export async function checkOut(eventId, checkinId, gateId) {
  await updateDoc(doc(db, "events", eventId, "checkins", checkinId), {
    status: "exited",
    exitedAt: serverTimestamp(),
  });

  // Decrement gate counter
  const gateRef = doc(db, "events", eventId, "gates", gateId);
  const gateSnap = await getDoc(gateRef);
  if (gateSnap.exists()) {
    const currentCount = gateSnap.data().currentCount || 1;
    const capacity = gateSnap.data().estimatedCapacityFlow || 1000;
    await updateDoc(gateRef, {
      currentCount: increment(-1),
      crowd: Math.max(0, (currentCount - 1) / capacity),
      updatedAt: serverTimestamp(),
    });
  }

  // Decrement total
  await updateDoc(doc(db, "events", eventId, "stats", "live"), {
    totalAttendees: increment(-1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update the real-time GPS location of a checked-in user.
 */
export async function updateLiveLocation(eventId, checkinId, lat, lng) {
  if (!eventId || !checkinId) return;
  await updateDoc(doc(db, "events", eventId, "checkins", checkinId), {
    lat,
    lng,
    locationUpdatedAt: serverTimestamp(),
  });
}
