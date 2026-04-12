"use client";

/**
 * Fan Dashboard — VenueIQ (Multi-Event Architecture)
 * 
 * Fully dynamic, event-scoped dashboard. All data from Firestore.
 * Features:
 * - Real-time venue stats from events/{eventId}/stats
 * - Dynamic venue map rendered from template + Firestore gates/zones
 * - Live gate crowd indicators from events/{eventId}/gates
 * - Queue dashboard from events/{eventId}/stalls
 * - SOS emergency writes to events/{eventId}/alerts
 * - Accessibility toggle
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  getEvent,
  onEventGatesSnapshot,
  onEventStallsSnapshot,
  onEventStatsSnapshot,
  onEventZonesSnapshot,
  createEventAlert,
  checkEventAccess,
  createOrder,
  onOrdersSnapshot,
} from "@/lib/eventService";
import { checkInAtGate, isCheckedIn, getUserCheckin, updateLiveLocation, onCheckinsSnapshot } from "@/lib/checkinService";

const LiveMapImpl = dynamic(() => import("@/components/LiveMapImpl"), { ssr: false });
import { VENUE_TEMPLATES } from "@/lib/venueTemplates";
import {
  Map, LayoutDashboard, UtensilsCrossed, Navigation,
  ShieldAlert, MessageSquare, LogOut, Menu, X,
  Bell, Accessibility, Users, Timer, TrendingUp, TrendingDown,
  Flame, Droplets, AlertTriangle, Phone, CheckCircle, Send, Sparkles, DoorOpen, MapPin, HeartPulse, Baby, CheckSquare, Info
} from "lucide-react";
import styles from "./dashboard.module.css";

/* ============================================
   CUSTOM ALGORITHM: Wait Time Prediction (F11)
   waitTime = (queueLength × avgServiceTime) / activeCounters
   ============================================ */
function predictWaitTime(queueLength, avgServiceTimeSec, activeCounters) {
  if (activeCounters <= 0) return Infinity;
  const rawWait = (queueLength * avgServiceTimeSec) / activeCounters;
  return Math.round(rawWait / 60);
}

function getCrowdStatus(level) {
  if (level < 0.4) return { label: "Low", color: "#0d904f", bg: "#e6f4ea", style: styles.gateStatusLow };
  if (level < 0.7) return { label: "Medium", color: "#f9ab00", bg: "#fef7e0", style: styles.gateStatusMedium };
  return { label: "High", color: "#d93025", bg: "#fce8e6", style: styles.gateStatusHigh };
}

/* ============================================
   DYNAMIC VENUE MAP — renders from template + live data
   ============================================ */
function DynamicVenueMap({ template, gates, zones, accessibilityMode }) {
  const tmpl = VENUE_TEMPLATES[template] || VENUE_TEMPLATES.stadium;

  // Map gate positions — match by index (gate order matches template positions)
  const mappedGates = tmpl.gatePositions.map((pos, i) => ({
    ...pos,
    data: gates[i] || null,
  }));

  // Map zone positions
  const mappedZones = tmpl.zonePositions.map((pos, i) => ({
    ...pos,
    data: zones[i] || null,
  }));

  return (
    <div className={styles.venueMapContainer}>
      <svg viewBox={tmpl.svgViewBox} className={styles.venueMapSvg}>
        {/* Outlines */}
        {tmpl.outlines.map((outline, i) => {
          if (outline.type === "ellipse") {
            return (
              <motion.ellipse
                key={`o-${i}`}
                cx={outline.cx} cy={outline.cy} rx={outline.rx} ry={outline.ry}
                fill="none" stroke="#dadce0" strokeWidth={i === 0 ? 3 : 2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: i * 0.3 }}
              />
            );
          }
          return (
            <motion.rect
              key={`o-${i}`}
              x={outline.x} y={outline.y} width={outline.w} height={outline.h} rx={outline.rx || 8}
              fill="none" stroke="#dadce0" strokeWidth={i === 0 ? 3 : 2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.3 }}
            />
          );
        })}

        {/* Center (Field/Stage) */}
        {tmpl.center && (
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <rect
              x={tmpl.center.x} y={tmpl.center.y}
              width={tmpl.center.w} height={tmpl.center.h}
              rx={8} fill="#e6f4ea" stroke="#34a853" strokeWidth="1.5"
            />
            <text
              x={tmpl.center.x + tmpl.center.w / 2}
              y={tmpl.center.y + tmpl.center.h / 2 + 4}
              textAnchor="middle" fontSize="9" fontWeight="600" fill="#34a853"
            >
              {tmpl.center.label}
            </text>
          </motion.g>
        )}

        {/* Zone heat blobs */}
        {mappedZones.map((mz, i) => {
          const density = mz.data?.density || 0.3;
          const status = getCrowdStatus(density);
          return (
            <motion.g key={`z-${i}`}>
              <motion.ellipse
                cx={mz.cx} cy={mz.cy} rx={mz.rx} ry={mz.ry}
                fill={status.color} opacity={0.15}
                animate={{
                  rx: [mz.rx, mz.rx + 4, mz.rx],
                  opacity: [0.1, 0.25, 0.1],
                }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
              />
              <text
                x={mz.cx} y={mz.cy + 4}
                textAnchor="middle" fontSize="8" fontWeight="600"
                fill={status.color} opacity={0.8}
              >
                {mz.data?.name || `Zone ${i + 1}`}
              </text>
            </motion.g>
          );
        })}

        {/* Gate markers */}
        {mappedGates.map((mg, i) => {
          if (!mg.data) return null;
          const status = getCrowdStatus(mg.data.crowd || 0);
          const isRecommended = mg.data.recommended;
          return (
            <motion.g
              key={`g-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <circle cx={mg.cx} cy={mg.cy} r="16" fill="white" stroke={status.color} strokeWidth="2.5" />
              <text x={mg.cx} y={mg.cy + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={status.color}>
                {mg.label || (mg.data.name || "").replace("Gate ", "")}
              </text>
              {isRecommended && (
                <motion.circle
                  cx={mg.cx + 12} cy={mg.cy - 12} r="5"
                  fill="#1a73e8"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Accessibility overlays */}
        {accessibilityMode && (
          <>
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <rect x="60" y="260" width="50" height="18" rx="4" fill="#7627bb" opacity="0.8" />
              <text x="85" y="272" textAnchor="middle" fontSize="7" fontWeight="600" fill="white">♿ Ramp</text>
            </motion.g>
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <rect x="280" y="80" width="55" height="18" rx="4" fill="#7627bb" opacity="0.8" />
              <text x="307" y="92" textAnchor="middle" fontSize="7" fontWeight="600" fill="white">♿ Elevator</text>
            </motion.g>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className={styles.mapLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#0d904f" }} /> Low
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#f9ab00" }} /> Medium
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#d93025" }} /> High
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#1a73e8" }} /> Recommended
        </div>
      </div>
    </div>
  );
}

/* ============================================
   SOS MODAL COMPONENT (F14)
   ============================================ */
function SOSModal({ onClose, onSubmit }) {
  const [sosType, setSosType] = useState("");
  const [sending, setSending] = useState(false);

  const sosTypes = [
    { id: "medical", label: "Medical", icon: <HeartPulse size={24} color="#d93025" />, desc: "Need medical assistance" },
    { id: "safety", label: "Safety Threat", icon: <ShieldAlert size={24} color="#d93025" />, desc: "Fight, harassment, etc." },
    { id: "fire", label: "Fire/Smoke", icon: <Flame size={24} color="#f9ab00" />, desc: "Fire or smoke detected" },
    { id: "lost", label: "Lost Person", icon: <Baby size={24} color="#1a73e8" />, desc: "Child or person lost" },
  ];

  const handleSubmit = async () => {
    if (!sosType) return;
    setSending(true);
    await onSubmit(sosType);
    setSending(false);
  };

  return (
    <motion.div
      className={styles.sosOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.sosModal}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={styles.sosModalTitle}>
          <AlertTriangle size={20} /> Emergency Alert
        </h3>
        <p className={styles.sosModalDesc}>
          Select the type of emergency. Staff will be dispatched immediately.
        </p>

        <div className={styles.sosTypeGrid}>
          {sosTypes.map((type) => (
            <button
              key={type.id}
              className={`${styles.sosTypeBtn} ${sosType === type.id ? styles.sosTypeBtnActive : ""}`}
              onClick={() => setSosType(type.id)}
            >
              <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>{type.icon}</div>
              {type.label}
            </button>
          ))}
        </div>

        <div className={styles.sosActions}>
          <button className={styles.sosCancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.sosSubmitBtn}
            onClick={handleSubmit}
            disabled={!sosType || sending}
          >
            {sending ? "Sending..." : "Send Alert"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================
   MAIN DASHBOARD PAGE (EVENT-SCOPED)
   ============================================ */
export default function FanDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { user, role, loading, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Check-in state
  const [checkedIn, setCheckedIn] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [locationShared, setLocationShared] = useState(false);

  // Gate navigation state
  const [myGate, setMyGate] = useState(null); // assigned gate (ticket gate)
  const [currentGate, setCurrentGate] = useState(null); // where attendee actually is

  // Food ordering state
  const [orderNote, setOrderNote] = useState("");
  const [orderingStall, setOrderingStall] = useState(null);
  const [myOrders, setMyOrders] = useState([]);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Event data
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Live Firestore data
  const [gates, setGates] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [zones, setZones] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [venueStats, setVenueStats] = useState({
    totalAttendees: 0, avgWaitTime: 0, activeAlerts: 0, crowdDensity: 0,
  });

  // No eventId → redirect to events browser
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
      return;
    }
    if (!eventId) {
      router.push("/events");
      return;
    }
  }, [user, loading, router, eventId]);

  // Load event metadata
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const ev = await getEvent(eventId);
        if (!ev) {
          router.push("/events");
          return;
        }
        setEventData(ev);
      } catch (err) {
        console.error("Failed to load event:", err);
      } finally {
        setLoadingEvent(false);
      }
    })();
  }, [eventId]);

  // Real-time Firestore listeners scoped to this event
  useEffect(() => {
    if (!eventId) return;
    const unsubs = [];
    try {
      unsubs.push(onEventGatesSnapshot(eventId, (data) => setGates(data)));
      unsubs.push(onEventStallsSnapshot(eventId, (data) => setStalls(data)));
      unsubs.push(onEventZonesSnapshot(eventId, (data) => setZones(data)));
      unsubs.push(onCheckinsSnapshot(eventId, (data) => setCheckins(data)));
      unsubs.push(onEventStatsSnapshot(eventId, (data) => {
        if (data) setVenueStats(data);
      }));
      unsubs.push(onOrdersSnapshot(eventId, (data) => {
        if (user?.uid) setMyOrders(data.filter(o => o.userId === user.uid));
      }));
    } catch (err) {
      console.warn("Firestore listeners failed:", err);
    }
    return () => unsubs.forEach(fn => fn && fn());
  }, [eventId, user]);

  // Check if user already checked in
  useEffect(() => {
    if (!eventId || !user?.uid) return;
    (async () => {
      try {
        const checkinObj = await getUserCheckin(eventId, user.uid);
        setCheckedIn(checkinObj);
        if (checkinObj?.gateName) {
          setMyGate(checkinObj.gateName);
          setCurrentGate(checkinObj.gateName);
        }
      } catch {}
    })();
  }, [eventId, user]);

  // GPS Live Tracking Logic
  useEffect(() => {
    let watchId;
    if (locationShared && checkedIn && checkedIn.id) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            updateLiveLocation(eventId, checkedIn.id, latitude, longitude).catch(err => console.warn("Failed sending GPS", err));
          },
          (error) => {
            console.error("GPS error:", error);
            setLocationShared(false); // auto-turn off on fail
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationShared, checkedIn, eventId]);

  // Handle gate check-in — automatically sets navigation state
  const handleCheckIn = async (gateId, gateName) => {
    if (checkedIn || checkingIn) return;
    setCheckingIn(true);
    try {
      await checkInAtGate(eventId, gateId, gateName, user.uid, user.displayName || "Attendee");
      const checkinObj = await getUserCheckin(eventId, user.uid);
      setCheckedIn(checkinObj);
      setMyGate(gateName);       // Auto-set ticket gate
      setCurrentGate(gateName);  // They're at this gate now
      setShowCheckinModal(false);
    } catch (err) {
      console.error("Check-in failed:", err);
      setCheckingIn(false);
    }
  };

  // AI Chat auto-scroll
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab, chatLoading]);

  const handleChatSend = async (overrideMsg = null) => {
    const rawInput = overrideMsg !== null ? overrideMsg : chatInput;
    if (!rawInput.trim() || chatLoading) return;
    const userMsg = rawInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    // Build live context for Gemini
    const liveContext = `You are VenueIQ AI Assistant for "${eventData?.eventName}" at "${eventData?.venueName}".
LIVE VENUE DATA (real-time):
- Total Attendees Checked In: ${venueStats.totalAttendees || 0}
- Active Alerts: ${venueStats.activeAlerts || 0}
- Gates: ${gates.map(g => `${g.name}: ${g.currentCount || 0} people, ~${g.waitMin || 0}min wait, crowd ${Math.round((g.crowd || 0) * 100)}%`).join("; ")}
- Restrooms: ${stalls.filter(s => s.type === "restroom").map(s => `${s.name}: ${s.queue || 0} in queue${s.accessible ? " (accessible)" : ""}`).join("; ")}
- Zones: ${zones.map(z => `${z.name}: ${z.current || 0}/${z.capacity || 0} (${Math.round((z.density || 0) * 100)}% full)`).join("; ")}

Answer based on THIS LIVE DATA. Be helpful, concise. If asked about best gate/restroom, recommend the one with least wait. If asked about emergency, tell them to use the SOS button.`;

    const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      setChatMessages(prev => [...prev, { role: "ai", text: "AI features require a Gemini API key. Add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file." }]);
      setChatLoading(false);
      return;
    }

    try {
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
      let success = false;
      let lastError = null;
      
      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: liveContext }] },
                { role: "model", parts: [{ text: "I'm VenueIQ AI, ready to help with live venue data. What would you like to know?" }] },
                ...chatMessages.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
                { role: "user", parts: [{ text: userMsg }] },
              ],
              generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              setChatMessages(prev => [...prev, { role: "ai", text }]);
              success = true;
              break;
            }
          } else {
            const errText = await res.text();
            console.error(`Gemini model ${model} failed:`, errText);
            try {
              const parsed = JSON.parse(errText);
              if (parsed.error?.message) lastError = parsed.error.message;
            } catch (e) {
              lastError = errText;
            }
          }
        } catch (e) {
          console.warn(`Gemini model ${model} failed in chat:`, e.message);
          lastError = e.message;
        }
      }
      
      if (!success) {
        setChatMessages(prev => [...prev, { role: "ai", text: `Sorry, I couldn't connect. Error: ${lastError || "Unknown error"}. Check your API key.` }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: "ai", text: `Sorry, an error occurred: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSOS = async (type) => {
    try {
      await createEventAlert(eventId, {
        type,
        userId: user?.uid,
        userName: user?.displayName || "Attendee",
        zone: "Unknown",
      });
    } catch (err) {
      console.error("SOS failed:", err);
    }
    setSosSuccess(true);
    setTimeout(() => {
      setSosOpen(false);
      setSosSuccess(false);
    }, 2000);
  };

  if (loading || loadingEvent) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <motion.div
            style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", margin: "0 auto 1rem" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p style={{ color: "#5f6368", fontSize: "0.9rem" }}>Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // Separate food stalls and restrooms
  const foodStalls = stalls.filter(s => s.type === "food");
  const restrooms = stalls.filter(s => s.type === "restroom");

  // Sorted by wait time (shortest first)
  const sortedFood = [...foodStalls].map(s => ({
    ...s,
    waitTime: predictWaitTime(s.queue || 0, s.avgService || 60, s.counters || 1),
  })).sort((a, b) => a.waitTime - b.waitTime);

  const sortedRestrooms = [...restrooms].map(r => ({
    ...r,
    waitTime: predictWaitTime(r.queue || 0, r.avgService || 120, r.counters || 1),
  })).sort((a, b) => a.waitTime - b.waitTime);

  // Mark recommended gate (lowest wait)
  const gatesWithRecommend = gates.map(g => ({
    ...g,
    recommended: g.recommended || false,
  }));
  if (gatesWithRecommend.length > 0) {
    const bestGate = gatesWithRecommend.reduce((a, b) => (a.waitMin || 99) < (b.waitMin || 99) ? a : b);
    gatesWithRecommend.forEach(g => { g.recommended = g.id === bestGate.id; });
  }

  const template = eventData?.template || "stadium";
  const tmpl = VENUE_TEMPLATES[template] || VENUE_TEMPLATES.stadium;

  const navItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "map", label: "Venue Map", icon: <Map size={18} /> },
    { id: "live_map", label: "Live GPS Map", icon: <MapPin size={18} /> },
    { id: "navigate", label: "Navigate", icon: <Navigation size={18} /> },
    { id: "chat", label: "AI Assistant", icon: <Sparkles size={18} /> },
  ];

  const calculatedAvgWaitTime = gates.length > 0 
    ? Math.round(gates.reduce((sum, g) => sum + (g.waitMin || 0), 0) / gates.length) 
    : 0;
  const calculatedCrowdDensity = eventData?.totalCapacity 
    ? Math.min(100, Math.round(((venueStats.totalAttendees || 0) / eventData.totalCapacity) * 100))
    : 0;

  return (
    <div className={styles.dashboardShell}>
      {sidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogoIcon}><Map size={18} /></div>
          <span className={styles.sidebarLogoText}>
            Venue<span className={styles.sidebarAccent}>IQ</span>
          </span>
        </div>

        {/* Event Info */}
        <div style={{ padding: "0 1rem", marginBottom: "0.5rem" }}>
          <div style={{ padding: "0.6rem", background: "#e8f0fe", borderRadius: "8px", fontSize: "0.75rem" }}>
            <div style={{ fontWeight: 700, color: "#1a73e8", marginBottom: "0.15rem" }}>
              {tmpl.icon} {eventData?.eventName}
            </div>
            <div style={{ color: "#5f6368" }}>{eventData?.venueName}</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navSectionLabel}>Dashboard</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className={styles.navSection}>
            <div className={styles.navSectionLabel}>Safety</div>
            <button
              className={`${styles.navItem} ${styles.navItemDanger}`}
              onClick={() => setSosOpen(true)}
            >
              <ShieldAlert size={18} />
              Emergency SOS
            </button>
          </div>

          <div className={styles.navSection}>
            <div className={styles.navSectionLabel}>Support</div>
            <button className={styles.navItem} onClick={() => setActiveTab("chat")}>
              <MessageSquare size={18} />
              AI Assistant
            </button>
            <button
              className={`${styles.navItem} ${accessibilityMode ? styles.navItemActive : ""}`}
              onClick={() => setAccessibilityMode(!accessibilityMode)}
            >
              <Accessibility size={18} />
              Accessibility
            </button>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className={styles.userAvatarImg} />
            ) : (
              <div className={styles.userAvatar}>
                {(user?.displayName || "U")[0].toUpperCase()}
              </div>
            )}
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.displayName || "User"}</div>
              <div className={styles.userRole}>attendee</div>
            </div>
          </div>
          <button className={`${styles.navItem} ${styles.navItemDanger}`} onClick={logout} style={{ marginTop: "0.5rem" }}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className={styles.pageTitle}>
              {activeTab === "overview" && "Dashboard"}
              {activeTab === "map" && "Venue Map"}
              {activeTab === "queues" && "Food & Queues"}
              {activeTab === "navigate" && "Navigate"}
              {activeTab === "chat" && "AI Assistant"}
            </h1>
          </div>
          <div className={styles.topBarRight}>
            {checkedIn && (
              <button
                className={styles.accessibilityToggle}
                onClick={() => setLocationShared(!locationShared)}
                style={{ 
                  background: locationShared ? "#e6f4ea" : "#f1f3f4", 
                  color: locationShared ? "#137333" : "#5f6368",
                  borderColor: locationShared ? "#137333" : "#e8eaed"
                }}
                aria-label="Toggle location sharing"
              >
                <MapPin size={16} />
                {locationShared ? "Sharing GPS" : "Share GPS"}
              </button>
            )}
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              Live
            </div>
            <button
              className={styles.accessibilityToggle}
              onClick={() => setAccessibilityMode(!accessibilityMode)}
              aria-label="Toggle accessibility mode"
            >
              <Accessibility size={16} />
              {accessibilityMode ? "ON" : "OFF"}
            </button>
            <button className={styles.topBarBtn} aria-label="Notifications">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div className={styles.pageContent}>
          {/* CHECK-IN BANNER — This is how real-time crowd data works (hidden for host/staff) */}
          {role !== "host" && role !== "staff" && (
            !checkedIn ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: "0.75rem 1rem", background: "linear-gradient(135deg, #e8f0fe, #f0e6ff)", borderRadius: "12px", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #d2b8ff" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <DoorOpen size={18} color="#1a73e8" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#202124" }}>Check In at your gate</div>
                    <div style={{ fontSize: "0.75rem", color: "#5f6368" }}>This helps track real-time crowd at each gate</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckinModal(true)}
                  style={{ padding: "0.5rem 1rem", background: "#1a73e8", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <CheckCircle size={14} /> Check In
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ padding: "0.5rem 1rem", background: "#e6f4ea", borderRadius: "10px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#137333", fontWeight: 600 }}
              >
                <CheckCircle size={16} /> You are checked in. Enjoy the event!
              </motion.div>
            )
          )}

          {/* CHECK-IN GATE SELECTION MODAL */}
          <AnimatePresence>
            {showCheckinModal && (
              <motion.div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowCheckinModal(false)}
              >
                <motion.div
                  style={{ background: "white", borderRadius: "16px", padding: "1.5rem", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <DoorOpen size={18} /> Select your entry gate
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#5f6368", marginBottom: "1rem" }}>Which gate are you entering from?</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {gates.map(gate => (
                      <button
                        key={gate.id}
                        onClick={() => handleCheckIn(gate.id, gate.name)}
                        disabled={checkingIn}
                        style={{ padding: "0.75rem 1rem", border: "1.5px solid #e8eaed", borderRadius: "10px", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", transition: "border-color 0.15s" }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = "#1a73e8"}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = "#e8eaed"}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#202124" }}>{gate.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#80868b" }}>{gate.section} · {gate.currentCount || 0} people</div>
                        </div>
                        <CheckCircle size={16} color="#1a73e8" />
                      </button>
                    ))}
                  </div>
                  {checkingIn && (
                    <div style={{ textAlign: "center", padding: "0.5rem", color: "#1a73e8", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      Checking in...
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {/* Stats */}
                <div className={styles.statsRow}>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconBlue}`}><Users size={20} /></div>
                    <div className={styles.statValue}>{(venueStats.totalAttendees || 0).toLocaleString()}</div>
                    <div className={styles.statLabel}>Total Attendees</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconGreen}`}><Timer size={20} /></div>
                    <div className={styles.statValue}>{calculatedAvgWaitTime} min</div>
                    <div className={styles.statLabel}>Avg Wait Time</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconYellow}`}><Flame size={20} /></div>
                    <div className={styles.statValue}>{calculatedCrowdDensity}%</div>
                    <div className={styles.statLabel}>Crowd Density</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconRed}`}><ShieldAlert size={20} /></div>
                    <div className={styles.statValue}>{venueStats.activeAlerts || 0}</div>
                    <div className={styles.statLabel}>Active Alerts</div>
                  </motion.div>
                </div>

                {/* Map + Gates */}
                <div className={styles.contentGrid}>
                  <div className={`${styles.colSpan8} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Map size={18} /> Live Venue Map</h3>
                      <button className={styles.accessibilityToggle} onClick={() => setAccessibilityMode(!accessibilityMode)}>
                        <Accessibility size={14} /> {accessibilityMode ? "Accessible" : "Standard"}
                      </button>
                    </div>
                    <DynamicVenueMap
                      template={template}
                      gates={gatesWithRecommend}
                      zones={zones}
                      accessibilityMode={accessibilityMode}
                    />
                  </div>

                  <div className={`${styles.colSpan4} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Navigation size={18} /> Gate Status</h3>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.gateGrid}>
                        {gatesWithRecommend.map(gate => {
                          const status = getCrowdStatus(gate.crowd || 0);
                          return (
                            <motion.div
                              key={gate.id}
                              className={styles.gateCard}
                              whileHover={{ scale: 1.03 }}
                              style={{ borderColor: gate.recommended ? "#1a73e8" : undefined }}
                            >
                              <div className={styles.gateName}>{gate.name}</div>
                              <div className={styles.gateWait}>~{gate.waitMin || 0} min</div>
                              <div className={`${styles.gateStatus} ${status.style}`} />
                              {gate.recommended && (
                                <span style={{ fontSize: "0.6rem", color: "#1a73e8", fontWeight: 700, marginTop: "0.3rem" }}>
                                  ★ RECOMMENDED
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                        {gates.length === 0 && (
                          <p style={{ color: "#80868b", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>
                            No gate data yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queues */}
                <div className={styles.contentGrid} style={{ marginTop: "1.5rem" }}>
                  <div className={`${styles.colSpan6} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><UtensilsCrossed size={18} /> Food Stalls</h3>
                      <span style={{ fontSize: "0.75rem", color: "#80868b" }}>Sorted by wait</span>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.queueList}>
                        {sortedFood.map(stall => {
                          const status = getCrowdStatus(stall.queue > 12 ? 0.9 : stall.queue > 6 ? 0.6 : 0.2);
                          return (
                            <motion.div key={stall.id} className={styles.queueItem} whileHover={{ x: 3 }}>
                              <div className={styles.queueIcon} style={{ background: status.bg, color: status.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {stall.icon || <UtensilsCrossed size={16}/>}
                              </div>
                              <div className={styles.queueInfo}>
                                <div className={styles.queueName}>{stall.name}</div>
                                <div className={styles.queueMeta}>{stall.queue || 0} in queue · {stall.counters || 1} counters</div>
                              </div>
                              <div className={styles.queueWait}>
                                <div className={styles.queueWaitTime} style={{ color: status.color }}>{stall.waitTime}</div>
                                <div className={styles.queueWaitLabel}>min</div>
                              </div>
                              <div className={styles.queueStatusDot} style={{ background: status.color }} />
                            </motion.div>
                          );
                        })}
                        {sortedFood.length === 0 && (
                          <p style={{ color: "#80868b", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>No food stalls configured</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.colSpan6} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Droplets size={18} /> Restrooms</h3>
                      {accessibilityMode && (
                        <span style={{ fontSize: "0.7rem", color: "#7627bb", fontWeight: 600, background: "#f3e8fd", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                          ♿ Showing accessible
                        </span>
                      )}
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.queueList}>
                        {sortedRestrooms
                          .filter(r => !accessibilityMode || r.accessible)
                          .map(room => {
                            const status = getCrowdStatus(room.queue > 10 ? 0.9 : room.queue > 5 ? 0.6 : 0.2);
                            return (
                              <motion.div key={room.id} className={styles.queueItem} whileHover={{ x: 3 }}>
                                <div className={styles.queueIcon} style={{ background: status.bg, color: status.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {room.icon || <Droplets size={16}/>}
                                </div>
                                <div className={styles.queueInfo}>
                                  <div className={styles.queueName}>{room.name}{room.accessible && " ♿"}</div>
                                  <div className={styles.queueMeta}>{room.queue || 0} in queue · {room.counters || 1} stalls</div>
                                </div>
                                <div className={styles.queueWait}>
                                  <div className={styles.queueWaitTime} style={{ color: status.color }}>{room.waitTime}</div>
                                  <div className={styles.queueWaitLabel}>min</div>
                                </div>
                                <div className={styles.queueStatusDot} style={{ background: status.color }} />
                              </motion.div>
                            );
                          })}
                        {sortedRestrooms.length === 0 && (
                          <p style={{ color: "#80868b", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>No restrooms configured</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== LIVE GPS MAP TAB ===== */}
            {activeTab === "live_map" && (
              <motion.div key="livemap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><MapPin size={18} /> Live OpenStreetMap GPS Tracking</h3>
                    {locationShared && (
                      <span style={{ fontSize: "0.75rem", background: "#e6f4ea", color: "#137333", padding: "0.2rem 0.5rem", borderRadius: "12px", fontWeight: "600" }}>Sharing Location</span>
                    )}
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: "0.85rem", color: "#5f6368", marginBottom: "1rem" }}>
                      See real-world attendee flow around the venue. Toggle "Share GPS" at the top to contribute your location securely.
                    </p>
                    <LiveMapImpl checkins={checkins} venueName={eventData?.venueName} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== MAP TAB ===== */}
            {activeTab === "map" && (
              <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><Map size={18} /> Interactive Venue Map</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className={styles.accessibilityToggle} onClick={() => setAccessibilityMode(!accessibilityMode)}>
                        <Accessibility size={14} /> {accessibilityMode ? "♿ Accessible" : "Standard View"}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "1rem" }}>
                    {/* Interactive Gate Grid */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#5f6368", marginBottom: "0.5rem" }}>
                        Click a gate for details <span style={{color:"#e8eaed"}}>|</span> <DoorOpen size={14} color="#0d904f"/> Your Gate <span style={{color:"#e8eaed"}}>|</span> <MapPin size={14} color="#d93025"/> Current Location
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.5rem" }}>
                        {gatesWithRecommend.map(g => {
                          const isMyGate = g.name === myGate;
                          const isCurrentGate = g.name === currentGate;
                          const pct = g.estimatedCapacityFlow ? Math.round((g.currentCount || 0) / g.estimatedCapacityFlow * 100) : 0;
                          const crowdColor = pct > 80 ? "#d93025" : pct > 50 ? "#f9ab00" : "#0d904f";
                          return (
                            <motion.div key={g.id} whileHover={{ scale: 1.04, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} whileTap={{ scale: 0.97 }}
                              style={{
                                padding: "0.75rem", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                                border: `2px solid ${isMyGate ? "#0d904f" : isCurrentGate ? "#1a73e8" : g.recommended ? "#f9ab00" : "#e8eaed"}`,
                                background: isMyGate ? "linear-gradient(135deg, #e6f4ea, #ceead6)" : isCurrentGate ? "linear-gradient(135deg, #e8f0fe, #d2e3fc)" : "white",
                              }}
                              onClick={() => {
                                alert(`${g.name}\n\nWait: ${g.waitMin || 0} min\nChecked In: ${g.currentCount || 0}\nCapacity Flow: ${g.estimatedCapacityFlow || "N/A"}\nCrowd: ${pct}%\n${g.recommended ? "⭐ RECOMMENDED GATE" : ""}\n${isMyGate ? "🎯 This is your ticket gate" : ""}`);
                              }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.3rem" }}>
                                {isMyGate && <DoorOpen size={16} color="#0d904f" />}
                                {isCurrentGate && <MapPin size={16} color="#d93025" />}
                                {g.recommended && <span style={{ fontSize: "0.6rem", background: "#fef7e0", color: "#f9ab00", padding: "0.1rem 0.3rem", borderRadius: "4px", fontWeight: 700 }}>★ BEST</span>}
                              </div>
                              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#202124" }}>{g.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.25rem" }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: crowdColor }} />
                                <span style={{ fontSize: "0.7rem", color: "#5f6368" }}>{g.waitMin || 0}min · {g.currentCount || 0} in</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                    <DynamicVenueMap template={template} gates={gatesWithRecommend} zones={zones} accessibilityMode={accessibilityMode} />
                  </div>
                </div>
              </motion.div>
            )}


            {/* ===== NAVIGATE TAB — Gate Selection + Shortest Path ===== */}
            {activeTab === "navigate" && (
              <motion.div key="navigate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><Navigation size={18} /> Smart Gate Navigation</h3>
                  </div>
                  <div style={{ padding: "1.25rem" }}>
                    {/* Gate selection */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#202124", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                           <DoorOpen size={14}/> My Ticket Gate (Where I should enter)
                        </label>
                        <select value={myGate || ""} onChange={e => setMyGate(e.target.value || null)}
                          style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1.5px solid #dadce0", fontSize: "0.85rem", fontFamily: "inherit", background: "white" }}>
                          <option value="">Select your gate...</option>
                          {gates.map(g => <option key={g.id} value={g.name}>{g.name} {g.waitMin > 0 ? `(~${g.waitMin} min wait)` : "(No wait)"}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#202124", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                           <MapPin size={14}/> I Am Currently At
                        </label>
                        <select value={currentGate || ""} onChange={e => setCurrentGate(e.target.value || null)}
                          style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1.5px solid #dadce0", fontSize: "0.85rem", fontFamily: "inherit", background: "white" }}>
                          <option value="">Select your current location...</option>
                          {gates.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                          <option value="parking">Parking Area</option>
                          <option value="outside">Outside Venue</option>
                        </select>
                      </div>
                    </div>

                    {/* Path recommendation */}
                    {myGate && currentGate && myGate !== currentGate && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ padding: "1rem", background: "linear-gradient(135deg, #ede9fe, #e8f0fe)", borderRadius: "12px", border: "1px solid #c7d2fe", marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <Navigation size={20} color="#4f46e5" />
                          <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#4f46e5" }}>Route Recommendation</h4>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#5f6368", marginBottom: "0.75rem" }}>
                          You are at <strong style={{ color: "#d93025" }}>{currentGate}</strong> but your ticket is for <strong style={{ color: "#0d904f" }}>{myGate}</strong>.
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.8rem", background: "white", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
                            <span style={{ color: "#d93025", display: "flex", alignItems: "center", gap:"0.2rem" }}><MapPin size={14}/> {currentGate}</span>
                            <span style={{ color: "#80868b" }}>→</span>
                            <span style={{ color: "#0d904f", display: "flex", alignItems: "center", gap:"0.2rem" }}><DoorOpen size={14}/> {myGate}</span>
                          </div>
                          {(() => {
                            const fromIdx = gates.findIndex(g => g.name === currentGate);
                            const toIdx = gates.findIndex(g => g.name === myGate);
                            // Fallback logic if they select parking/outside
                            const fIdx = fromIdx !== -1 ? fromIdx : 0;
                            const tIdx = toIdx !== -1 ? toIdx : 0;
                            let gatesDiff = Math.abs(fIdx - tIdx);
                            if (fromIdx === -1) gatesDiff += 2; // Extra distance from outside
                            
                            const estMin = gatesDiff * 3 + 2; // ~3 min per gate + base 2 min
                            const estMeters = estMin * 80;    // ~80m per minute walk
                            
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                <span style={{ fontSize: "0.8rem", color: "#4f46e5", fontWeight: 700 }}>
                                  ~{estMin} min walk ({gatesDiff} gate{gatesDiff !== 1 ? "s" : ""} apart)
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#80868b", fontWeight: 600 }}>
                                  Shortest Path Distance: ~{estMeters} meters
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "#80868b", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Info size={14}/> Follow the outer concourse path. Look for signage pointing to {myGate}.
                        </p>
                      </motion.div>
                    )}

                    {myGate && currentGate && myGate === currentGate && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ padding: "1rem", background: "#e6f4ea", borderRadius: "12px", textAlign: "center", border: "1px solid #ceead6" }}>
                        <CheckCircle size={36} color="#137333" />
                        <h4 style={{ color: "#137333", fontWeight: 700, marginTop: "0.3rem" }}>You are at the correct gate!</h4>
                        <p style={{ color: "#5f6368", fontSize: "0.85rem" }}>Head through {myGate} to reach your seat.</p>
                      </motion.div>
                    )}

                    {/* Gate status overview */}
                    <div style={{ marginTop: "1.25rem" }}>
                      <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#202124", marginBottom: "0.5rem" }}>All Gates Status</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
                        {gates.map(g => (
                          <div key={g.id} style={{
                            padding: "0.6rem", borderRadius: "8px", border: `1.5px solid ${g.name === myGate ? "#0d904f" : g.name === currentGate ? "#d93025" : "#e8eaed"}`,
                            background: g.name === myGate ? "#e6f4ea" : g.name === currentGate ? "#fce8e6" : "#f8f9fa",
                          }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#202124", display:"flex", alignItems:"center", gap:"0.2rem" }}>
                              {g.name === myGate && <DoorOpen size={14} color="#0d904f"/>}
                              {g.name === currentGate && <MapPin size={14} color="#d93025"/>}
                              {g.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#5f6368" }}>
                              Wait: {g.waitMin || 0} min · {g.currentCount || 0} checked in
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== AI CHAT TAB ===== */}
            {activeTab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={styles.dashCard} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><Sparkles size={18} /> Venue AI Assistant</h3>
                    <span style={{ fontSize: "0.7rem", color: "#7c3aed", background: "#f3e8fd", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>Powered by Gemini</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {/* Welcome message */}
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: "center", padding: "2rem", color: "#80868b" }}>
                        <Sparkles size={40} style={{ margin: "0 auto 1rem", color: "#7c3aed" }} />
                        <h4 style={{ color: "#202124", fontWeight: 700, marginBottom: "0.5rem" }}>Ask me anything about the venue!</h4>
                        <p style={{ fontSize: "0.85rem", maxWidth: 350, margin: "0 auto" }}>I have access to live venue data — crowd levels, wait times, restrooms, and more.</p>
                        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                          {["Which gate has the shortest wait?", "Where is the nearest restroom?", "How crowded is VIP?", "Find me an accessible restroom"].map((q, i) => (
                            <button key={i} onClick={() => { handleChatSend(q); }} style={{ padding: "0.4rem 0.75rem", border: "1px solid #e8eaed", borderRadius: "20px", background: "white", color: "#5f6368", fontSize: "0.75rem", cursor: "pointer" }}>{q}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Messages */}
                    {chatMessages.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "0.75rem 1rem", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "#1a73e8" : "#f1f3f4", color: msg.role === "user" ? "white" : "#202124", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", gap: "0.3rem", padding: "0.5rem" }}>
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#9aa0a6" }} animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e8eaed", display: "flex", gap: "0.5rem" }}>
                    <input
                      style={{ flex: 1, padding: "0.7rem 1rem", border: "1.5px solid #e8eaed", borderRadius: "24px", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" }}
                      placeholder="Ask about the venue..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                      aria-label="Chat input"
                    />
                    <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: chatInput.trim() ? "#1a73e8" : "#f1f3f4", color: chatInput.trim() ? "white" : "#9aa0a6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Send message">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SOS Button */}
      <div className={styles.sosContainer}>
        <motion.button
          className={styles.sosButton}
          onClick={() => setSosOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Emergency SOS"
        >
          <Phone size={24} />
        </motion.button>
        <span className={styles.sosLabel}>SOS</span>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
        {sosOpen && !sosSuccess && (
          <SOSModal onClose={() => setSosOpen(false)} onSubmit={handleSOS} />
        )}
        {sosSuccess && (
          <motion.div className={styles.sosOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.sosModal} initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ textAlign: "center", padding: "3rem" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</motion.div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#137333" }}>Alert Sent!</h3>
              <p style={{ color: "#5f6368", marginTop: "0.5rem" }}>Staff has been notified and will reach you shortly.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
