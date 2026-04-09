/**
 * Firestore Service — VenueIQ
 * 
 * All Firestore read/write operations in one place.
 * Uses real-time listeners (onSnapshot) for live updates.
 * 
 * Collections:
 *   gates, foodStalls, restrooms, zones, venueStats, alerts, staffMembers, users
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ===== REAL-TIME LISTENERS =====
// These return unsubscribe functions — call them to stop listening

/** Listen to all gates in real-time */
export function onGatesSnapshot(callback) {
  return onSnapshot(collection(db, "gates"), (snapshot) => {
    const gates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(gates);
  });
}

/** Listen to all food stalls in real-time */
export function onFoodStallsSnapshot(callback) {
  return onSnapshot(collection(db, "foodStalls"), (snapshot) => {
    const stalls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(stalls);
  });
}

/** Listen to all restrooms in real-time */
export function onRestroomsSnapshot(callback) {
  return onSnapshot(collection(db, "restrooms"), (snapshot) => {
    const restrooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(restrooms);
  });
}

/** Listen to venue stats (single doc) in real-time */
export function onVenueStatsSnapshot(callback) {
  return onSnapshot(doc(db, "venueStats", "live"), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  });
}

/** Listen to all zones in real-time */
export function onZonesSnapshot(callback) {
  return onSnapshot(collection(db, "zones"), (snapshot) => {
    const zones = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(zones);
  });
}

/** Listen to alerts (ordered by creation time, newest first) */
export function onAlertsSnapshot(callback) {
  const q = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(alerts);
  });
}

/** Listen to staff members */
export function onStaffSnapshot(callback) {
  return onSnapshot(collection(db, "staffMembers"), (snapshot) => {
    const staffMembers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(staffMembers);
  });
}

// ===== WRITE OPERATIONS =====

/** Create a new SOS alert from a fan */
export async function createSOSAlert({ type, userId, userName, zone, section }) {
  return addDoc(collection(db, "alerts"), {
    type: "sos",
    severity: "urgent",
    title: `${type === "medical" ? "🏥 Medical Emergency" : type === "safety" ? "🚨 Safety Threat" : type === "fire" ? "🔥 Fire/Smoke" : "👶 Lost Person"} reported by ${userName || "Fan"}`,
    zone: zone || "Unknown",
    section: section || "",
    status: "active",
    assignedTo: null,
    reportedBy: userId || null,
    reportedByName: userName || "Anonymous",
    sosType: type,
    createdAt: serverTimestamp(),
  });
}

/** Assign staff to an alert */
export async function assignStaffToAlert(alertId, staffName) {
  return updateDoc(doc(db, "alerts", alertId), {
    assignedTo: staffName,
    status: "dispatched",
    updatedAt: serverTimestamp(),
  });
}

/** Resolve an alert */
export async function resolveAlert(alertId) {
  return updateDoc(doc(db, "alerts", alertId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
  });
}

/** Update gate data (for simulation or real sensors) */
export async function updateGate(gateId, data) {
  return updateDoc(doc(db, "gates", gateId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update food stall queue */
export async function updateFoodStall(stallId, data) {
  return updateDoc(doc(db, "foodStalls", stallId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update restroom queue */
export async function updateRestroom(restroomId, data) {
  return updateDoc(doc(db, "restrooms", restroomId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update zone data */
export async function updateZone(zoneId, data) {
  return updateDoc(doc(db, "zones", zoneId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update venue stats */
export async function updateVenueStats(data) {
  return updateDoc(doc(db, "venueStats", "live"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update staff member status */
export async function updateStaffStatus(staffId, status, zone) {
  return updateDoc(doc(db, "staffMembers", staffId), {
    status,
    zone: zone || "",
    updatedAt: serverTimestamp(),
  });
}

/** Submit post-event feedback */
export async function submitFeedback({ userId, rating, comment }) {
  return addDoc(collection(db, "feedback"), {
    userId: userId || null,
    rating,
    comment: comment || "",
    createdAt: serverTimestamp(),
  });
}
