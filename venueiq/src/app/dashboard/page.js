"use client";

/**
 * Fan Dashboard — VenueIQ
 * 
 * The main fan experience hub. Features:
 * - Real-time venue stats (crowd count, wait times, active alerts)
 * - Interactive venue map with live crowd heatmap
 * - Live gate crowd indicators (F5)
 * - Queue dashboard for food & restrooms (F10)
 * - SOS emergency button (F14)
 * - Accessibility toggle (F3)
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Map, LayoutDashboard, UtensilsCrossed, Navigation,
  ShieldAlert, MessageSquare, Settings, LogOut, Menu, X,
  Bell, Accessibility, Users, Timer, TrendingUp, TrendingDown,
  Flame, Droplets, AlertTriangle, ChevronRight, Phone
} from "lucide-react";
import styles from "./dashboard.module.css";

/* ============================================
   CUSTOM ALGORITHM: Wait Time Prediction (F11)
   waitTime = (queueLength × avgServiceTime) / activeCounters
   ============================================ */
function predictWaitTime(queueLength, avgServiceTimeSec, activeCounters) {
  if (activeCounters <= 0) return Infinity;
  const rawWait = (queueLength * avgServiceTimeSec) / activeCounters;
  return Math.round(rawWait / 60); // Convert to minutes
}

/* ============================================
   SIMULATED REAL-TIME DATA
   In production, these come from Firestore real-time listeners
   ============================================ */
const INITIAL_GATES = [
  { id: "A", name: "Gate A", crowd: 0.3, waitMin: 5, section: "North", recommended: true },
  { id: "B", name: "Gate B", crowd: 0.7, waitMin: 15, section: "East", recommended: false },
  { id: "C", name: "Gate C", crowd: 0.5, waitMin: 10, section: "South", recommended: false },
  { id: "D", name: "Gate D", crowd: 0.9, waitMin: 25, section: "West", recommended: false },
  { id: "E", name: "Gate E", crowd: 0.2, waitMin: 3, section: "North-East", recommended: true },
];

const INITIAL_FOOD_STALLS = [
  { id: 1, name: "Samosa Central", type: "food", queue: 12, avgService: 45, counters: 3, icon: "🥟" },
  { id: 2, name: "Biryani House", type: "food", queue: 8, avgService: 90, counters: 2, icon: "🍚" },
  { id: 3, name: "Pizza Corner", type: "food", queue: 5, avgService: 60, counters: 2, icon: "🍕" },
  { id: 4, name: "Chai Point", type: "food", queue: 18, avgService: 30, counters: 4, icon: "☕" },
  { id: 5, name: "Juice Bar", type: "food", queue: 3, avgService: 40, counters: 1, icon: "🥤" },
];

const INITIAL_RESTROOMS = [
  { id: 1, name: "Restroom A (North)", type: "restroom", queue: 6, avgService: 120, counters: 8, icon: "🚻", accessible: true },
  { id: 2, name: "Restroom B (East)", type: "restroom", queue: 14, avgService: 120, counters: 6, icon: "🚻", accessible: false },
  { id: 3, name: "Restroom C (South)", type: "restroom", queue: 2, avgService: 120, counters: 10, icon: "🚻", accessible: true },
];

function getCrowdStatus(level) {
  if (level < 0.4) return { label: "Low", color: "#0d904f", bg: "#e6f4ea", style: styles.gateStatusLow };
  if (level < 0.7) return { label: "Medium", color: "#f9ab00", bg: "#fef7e0", style: styles.gateStatusMedium };
  return { label: "High", color: "#d93025", bg: "#fce8e6", style: styles.gateStatusHigh };
}

/* ============================================
   VENUE MAP COMPONENT — Interactive SVG (F7)
   ============================================ */
function VenueMap({ gates, accessibilityMode }) {
  const gatePositions = [
    { id: "A", cx: 200, cy: 60 },
    { id: "B", cx: 340, cy: 150 },
    { id: "C", cx: 280, cy: 290 },
    { id: "D", cx: 60, cy: 220 },
    { id: "E", cx: 100, cy: 100 },
  ];

  const zoneData = [
    { cx: 200, cy: 170, r: 55, crowd: 0.7, label: "Zone A" },
    { cx: 130, cy: 200, r: 40, crowd: 0.3, label: "Zone B" },
    { cx: 270, cy: 200, r: 45, crowd: 0.9, label: "Zone C" },
    { cx: 200, cy: 250, r: 35, crowd: 0.5, label: "Zone D" },
  ];

  return (
    <div className={styles.venueMapContainer}>
      <svg viewBox="0 0 400 350" className={styles.venueMapSvg}>
        {/* Stadium Outline */}
        <motion.ellipse
          cx="200" cy="175" rx="170" ry="130"
          fill="none" stroke="#dadce0" strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <motion.ellipse
          cx="200" cy="175" rx="120" ry="85"
          fill="none" stroke="#e8eaed" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />
        {/* Playing Field */}
        <motion.rect
          x="145" y="140" width="110" height="70" rx="8"
          fill="#e6f4ea" stroke="#34a853" strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        />
        <line x1="200" y1="140" x2="200" y2="210" stroke="#34a853" strokeWidth="1" />
        <circle cx="200" cy="175" r="15" fill="none" stroke="#34a853" strokeWidth="1" />

        {/* Crowd Heat Zones */}
        {zoneData.map((zone, i) => {
          const status = getCrowdStatus(zone.crowd);
          return (
            <motion.g key={i}>
              <motion.circle
                cx={zone.cx} cy={zone.cy} r={zone.r}
                fill={status.color}
                opacity={0.15}
                animate={{
                  r: [zone.r, zone.r + 5, zone.r],
                  opacity: [0.1, 0.25, 0.1],
                }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
              />
              <text
                x={zone.cx} y={zone.cy + 4}
                textAnchor="middle"
                fontSize="9" fontWeight="600"
                fill={status.color} opacity={0.8}
              >
                {zone.label}
              </text>
            </motion.g>
          );
        })}

        {/* Gate Markers */}
        {gatePositions.map((pos) => {
          const gate = gates.find(g => g.id === pos.id);
          if (!gate) return null;
          const status = getCrowdStatus(gate.crowd);
          return (
            <motion.g key={pos.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + gatePositions.indexOf(pos) * 0.1 }}
            >
              <circle cx={pos.cx} cy={pos.cy} r="16" fill="white" stroke={status.color} strokeWidth="2.5" />
              <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={status.color}>
                {pos.id}
              </text>
              {gate.recommended && (
                <motion.circle
                  cx={pos.cx + 12} cy={pos.cy - 12} r="5"
                  fill="#1a73e8"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Accessibility markers */}
        {accessibilityMode && (
          <>
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <rect x="90" y="260" width="50" height="18" rx="4" fill="#7627bb" opacity="0.8" />
              <text x="115" y="272" textAnchor="middle" fontSize="7" fontWeight="600" fill="white">♿ Ramp</text>
            </motion.g>
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <rect x="280" y="90" width="55" height="18" rx="4" fill="#7627bb" opacity="0.8" />
              <text x="307" y="102" textAnchor="middle" fontSize="7" fontWeight="600" fill="white">♿ Elevator</text>
            </motion.g>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className={styles.mapLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#0d904f" }} />
          Low
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#f9ab00" }} />
          Medium
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#d93025" }} />
          High
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: "#1a73e8" }} />
          Recommended
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
    { id: "medical", label: "🏥 Medical", desc: "Need medical assistance" },
    { id: "safety", label: "🚨 Safety Threat", desc: "Fight, harassment, etc." },
    { id: "fire", label: "🔥 Fire/Smoke", desc: "Fire or smoke detected" },
    { id: "lost", label: "👶 Lost Person", desc: "Child or person lost" },
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
          Select the type of emergency. Staff will be dispatched to your location immediately.
        </p>

        <div className={styles.sosTypeGrid}>
          {sosTypes.map((type) => (
            <button
              key={type.id}
              className={`${styles.sosTypeBtn} ${sosType === type.id ? styles.sosTypeBtnActive : ""}`}
              onClick={() => setSosType(type.id)}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{type.label.split(" ")[0]}</div>
              {type.label.split(" ").slice(1).join(" ")}
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
   MAIN DASHBOARD PAGE
   ============================================ */
export default function FanDashboard() {
  const router = useRouter();
  const { user, role, loading, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Simulated real-time data (Firestore listeners in production)
  const [gates, setGates] = useState(INITIAL_GATES);
  const [foodStalls, setFoodStalls] = useState(INITIAL_FOOD_STALLS);
  const [restrooms, setRestrooms] = useState(INITIAL_RESTROOMS);
  const [venueStats, setVenueStats] = useState({
    totalAttendees: 34567,
    avgWaitTime: 8,
    activeAlerts: 3,
    crowdDensity: 72,
  });

  // Simulate real-time updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGates(prev => prev.map(g => ({
        ...g,
        crowd: Math.max(0.1, Math.min(1, g.crowd + (Math.random() - 0.5) * 0.15)),
        waitMin: Math.max(1, g.waitMin + Math.round((Math.random() - 0.5) * 4)),
      })));
      setFoodStalls(prev => prev.map(s => ({
        ...s,
        queue: Math.max(0, s.queue + Math.round((Math.random() - 0.5) * 3)),
      })));
      setRestrooms(prev => prev.map(r => ({
        ...r,
        queue: Math.max(0, r.queue + Math.round((Math.random() - 0.5) * 2)),
      })));
      setVenueStats(prev => ({
        ...prev,
        totalAttendees: prev.totalAttendees + Math.round((Math.random() - 0.3) * 50),
        avgWaitTime: Math.max(3, prev.avgWaitTime + Math.round((Math.random() - 0.5) * 2)),
        crowdDensity: Math.max(40, Math.min(95, prev.crowdDensity + Math.round((Math.random() - 0.5) * 5))),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  const handleSOS = async (type) => {
    // In production: write to Firestore `alerts` collection
    console.log("SOS Alert:", type, "User:", user?.uid);
    setSosSuccess(true);
    setTimeout(() => {
      setSosOpen(false);
      setSosSuccess(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: "center" }}
        >
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

  // Sorted food stalls by wait time (shortest first)
  const sortedFood = [...foodStalls].map(s => ({
    ...s,
    waitTime: predictWaitTime(s.queue, s.avgService, s.counters),
  })).sort((a, b) => a.waitTime - b.waitTime);

  const sortedRestrooms = [...restrooms].map(r => ({
    ...r,
    waitTime: predictWaitTime(r.queue, r.avgService, r.counters),
  })).sort((a, b) => a.waitTime - b.waitTime);

  const navItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "map", label: "Venue Map", icon: <Map size={18} /> },
    { id: "queues", label: "Food & Queues", icon: <UtensilsCrossed size={18} /> },
    { id: "navigate", label: "Navigate", icon: <Navigation size={18} /> },
  ];

  return (
    <div className={styles.dashboardShell}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogoIcon}><Map size={18} /></div>
          <span className={styles.sidebarLogoText}>
            Venue<span className={styles.sidebarAccent}>IQ</span>
          </span>
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
              <div className={styles.userRole}>{role || "fan"}</div>
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
        {/* Top Bar */}
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
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              Live
            </div>
            <button
              className={styles.accessibilityToggle}
              onClick={() => setAccessibilityMode(!accessibilityMode)}
              aria-label="Toggle accessibility mode"
              title="Accessibility Mode"
            >
              <Accessibility size={16} />
              {accessibilityMode ? "ON" : "OFF"}
            </button>
            <button className={styles.topBarBtn} aria-label="Notifications">
              <Bell size={20} />
              {venueStats.activeAlerts > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  width: 8, height: 8, background: "#ea4335",
                  borderRadius: "50%", border: "2px solid white"
                }} />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContent}>
          <AnimatePresence mode="wait">
            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Stats Row */}
                <div className={styles.statsRow}>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconBlue}`}><Users size={20} /></div>
                    <div className={styles.statValue}>{venueStats.totalAttendees.toLocaleString()}</div>
                    <div className={styles.statLabel}>Total Attendees</div>
                    <div className={`${styles.statChange} ${styles.statChangeUp}`}><TrendingUp size={10} /> +2.3%</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconGreen}`}><Timer size={20} /></div>
                    <div className={styles.statValue}>{venueStats.avgWaitTime} min</div>
                    <div className={styles.statLabel}>Avg Wait Time</div>
                    <div className={`${styles.statChange} ${styles.statChangeDown}`}><TrendingDown size={10} /> -12%</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconYellow}`}><Flame size={20} /></div>
                    <div className={styles.statValue}>{venueStats.crowdDensity}%</div>
                    <div className={styles.statLabel}>Crowd Density</div>
                  </motion.div>
                  <motion.div className={styles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${styles.statIcon} ${styles.statIconRed}`}><ShieldAlert size={20} /></div>
                    <div className={styles.statValue}>{venueStats.activeAlerts}</div>
                    <div className={styles.statLabel}>Active Alerts</div>
                  </motion.div>
                </div>

                {/* Map + Gates Row */}
                <div className={styles.contentGrid}>
                  <div className={`${styles.colSpan8} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Map size={18} /> Live Venue Map</h3>
                      <button className={styles.accessibilityToggle} onClick={() => setAccessibilityMode(!accessibilityMode)}>
                        <Accessibility size={14} /> {accessibilityMode ? "Accessible" : "Standard"}
                      </button>
                    </div>
                    <VenueMap gates={gates} accessibilityMode={accessibilityMode} />
                  </div>

                  <div className={`${styles.colSpan4} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Navigation size={18} /> Gate Status</h3>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.gateGrid}>
                        {gates.map(gate => {
                          const status = getCrowdStatus(gate.crowd);
                          return (
                            <motion.div
                              key={gate.id}
                              className={styles.gateCard}
                              whileHover={{ scale: 1.03 }}
                              style={{ borderColor: gate.recommended ? "#1a73e8" : undefined }}
                            >
                              <div className={styles.gateName}>{gate.name}</div>
                              <div className={styles.gateWait}>~{gate.waitMin} min</div>
                              <div className={`${styles.gateStatus} ${status.style}`} />
                              {gate.recommended && (
                                <span style={{ fontSize: "0.6rem", color: "#1a73e8", fontWeight: 700, marginTop: "0.3rem" }}>
                                  ★ RECOMMENDED
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queues Row */}
                <div className={styles.contentGrid} style={{ marginTop: "1.5rem" }}>
                  <div className={`${styles.colSpan6} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><UtensilsCrossed size={18} /> Food Stalls</h3>
                      <span style={{ fontSize: "0.75rem", color: "#80868b" }}>Sorted by wait time</span>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.queueList}>
                        {sortedFood.map(stall => {
                          const status = getCrowdStatus(stall.queue > 12 ? 0.9 : stall.queue > 6 ? 0.6 : 0.2);
                          return (
                            <motion.div key={stall.id} className={styles.queueItem} whileHover={{ x: 3 }}>
                              <div className={styles.queueIcon} style={{ background: status.bg, fontSize: "1.2rem" }}>
                                {stall.icon}
                              </div>
                              <div className={styles.queueInfo}>
                                <div className={styles.queueName}>{stall.name}</div>
                                <div className={styles.queueMeta}>{stall.queue} in queue · {stall.counters} counters</div>
                              </div>
                              <div className={styles.queueWait}>
                                <div className={styles.queueWaitTime} style={{ color: status.color }}>
                                  {stall.waitTime}
                                </div>
                                <div className={styles.queueWaitLabel}>min</div>
                              </div>
                              <div className={styles.queueStatusDot} style={{ background: status.color }} />
                            </motion.div>
                          );
                        })}
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
                                <div className={styles.queueIcon} style={{ background: status.bg, fontSize: "1.2rem" }}>
                                  {room.icon}
                                </div>
                                <div className={styles.queueInfo}>
                                  <div className={styles.queueName}>
                                    {room.name}
                                    {room.accessible && " ♿"}
                                  </div>
                                  <div className={styles.queueMeta}>{room.queue} in queue · {room.counters} stalls</div>
                                </div>
                                <div className={styles.queueWait}>
                                  <div className={styles.queueWaitTime} style={{ color: status.color }}>
                                    {room.waitTime}
                                  </div>
                                  <div className={styles.queueWaitLabel}>min</div>
                                </div>
                                <div className={styles.queueStatusDot} style={{ background: status.color }} />
                              </motion.div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== MAP TAB ===== */}
            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><Map size={18} /> Interactive Venue Map</h3>
                    <button className={styles.accessibilityToggle} onClick={() => setAccessibilityMode(!accessibilityMode)}>
                      <Accessibility size={14} /> {accessibilityMode ? "♿ Accessible Routes" : "Standard View"}
                    </button>
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <VenueMap gates={gates} accessibilityMode={accessibilityMode} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== QUEUES TAB ===== */}
            {activeTab === "queues" && (
              <motion.div
                key="queues"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={styles.contentGrid}>
                  <div className={`${styles.colSpan12} ${styles.dashCard}`}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><UtensilsCrossed size={18} /> All Food & Beverage Stalls</h3>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.queueList}>
                        {sortedFood.map(stall => {
                          const status = getCrowdStatus(stall.queue > 12 ? 0.9 : stall.queue > 6 ? 0.6 : 0.2);
                          return (
                            <motion.div key={stall.id} className={styles.queueItem} whileHover={{ x: 3 }}>
                              <div className={styles.queueIcon} style={{ background: status.bg, fontSize: "1.2rem" }}>
                                {stall.icon}
                              </div>
                              <div className={styles.queueInfo}>
                                <div className={styles.queueName}>{stall.name}</div>
                                <div className={styles.queueMeta}>
                                  {stall.queue} in queue · {stall.counters} counters · Avg service: {stall.avgService}s
                                </div>
                              </div>
                              <div className={styles.queueWait}>
                                <div className={styles.queueWaitTime} style={{ color: status.color }}>
                                  {stall.waitTime}
                                </div>
                                <div className={styles.queueWaitLabel}>min wait</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.colSpan12} ${styles.dashCard}`} style={{ marginTop: 0 }}>
                    <div className={styles.dashCardHeader}>
                      <h3 className={styles.dashCardTitle}><Droplets size={18} /> All Restrooms</h3>
                    </div>
                    <div className={styles.dashCardBody}>
                      <div className={styles.queueList}>
                        {sortedRestrooms.map(room => {
                          const status = getCrowdStatus(room.queue > 10 ? 0.9 : room.queue > 5 ? 0.6 : 0.2);
                          return (
                            <motion.div key={room.id} className={styles.queueItem} whileHover={{ x: 3 }}>
                              <div className={styles.queueIcon} style={{ background: status.bg, fontSize: "1.2rem" }}>
                                {room.icon}
                              </div>
                              <div className={styles.queueInfo}>
                                <div className={styles.queueName}>{room.name} {room.accessible && "♿"}</div>
                                <div className={styles.queueMeta}>{room.queue} in queue · {room.counters} stalls</div>
                              </div>
                              <div className={styles.queueWait}>
                                <div className={styles.queueWaitTime} style={{ color: status.color }}>
                                  {room.waitTime}
                                </div>
                                <div className={styles.queueWaitLabel}>min wait</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== NAVIGATE TAB ===== */}
            {activeTab === "navigate" && (
              <motion.div
                key="navigate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><Navigation size={18} /> Smart Navigation</h3>
                  </div>
                  <div className={styles.dashCardBody} style={{ textAlign: "center", padding: "3rem" }}>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        width: 80, height: 80, borderRadius: 20, background: "#e8f0fe",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1.5rem", color: "#1a73e8"
                      }}
                    >
                      <Navigation size={36} />
                    </motion.div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#202124", marginBottom: "0.5rem" }}>
                      Step-by-Step Directions
                    </h3>
                    <p style={{ color: "#5f6368", maxWidth: 400, margin: "0 auto 1.5rem" }}>
                      Get turn-by-turn navigation to your seat, nearest food stall, or restroom.
                    </p>
                    <p style={{ color: "#80868b", fontSize: "0.85rem" }}>
                      🔜 Coming soon — AR-style seat finder with step-by-step directions
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== AI CHAT TAB ===== */}
            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={styles.dashCard}>
                  <div className={styles.dashCardHeader}>
                    <h3 className={styles.dashCardTitle}><MessageSquare size={18} /> Venue AI Assistant</h3>
                  </div>
                  <div className={styles.dashCardBody} style={{ textAlign: "center", padding: "3rem" }}>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        width: 80, height: 80, borderRadius: 20, background: "#f3e8fd",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1.5rem", color: "#9333ea"
                      }}
                    >
                      <MessageSquare size={36} />
                    </motion.div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#202124", marginBottom: "0.5rem" }}>
                      Powered by Gemini AI
                    </h3>
                    <p style={{ color: "#5f6368", maxWidth: 400, margin: "0 auto 1.5rem" }}>
                      Ask anything about the venue — food recommendations, crowd status, nearest exits, and more. Uses live venue data.
                    </p>
                    <p style={{ color: "#80868b", fontSize: "0.85rem" }}>
                      🔜 Gemini AI chatbot integration coming in Phase 3
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SOS Floating Button */}
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
          <motion.div
            className={styles.sosOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.sosModal}
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              style={{ textAlign: "center", padding: "3rem" }}
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                style={{ fontSize: "3rem", marginBottom: "1rem" }}
              >
                ✅
              </motion.div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#137333" }}>Alert Sent!</h3>
              <p style={{ color: "#5f6368", marginTop: "0.5rem" }}>Staff has been notified and will reach your location shortly.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
