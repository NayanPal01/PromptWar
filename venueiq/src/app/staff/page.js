"use client";

/**
 * Staff Dashboard — VenueIQ
 * 
 * Operations command center for venue staff/admins. Features:
 * - Real-time crowd heatmap (F23)
 * - Alert management with dispatch (F24)
 * - Zone capacity monitoring
 * - Staff dispatch panel (F16)
 * - Anomaly detection indicators (F15)
 * - Venue analytics overview (F25)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Map, LayoutDashboard, ShieldAlert, Users, Bell, LogOut,
  Menu, X, Settings, AlertTriangle, TrendingUp, TrendingDown,
  Flame, Activity, Radio, UserCheck, Timer, BarChart3,
  ChevronRight, CheckCircle, XCircle, Zap, Eye
} from "lucide-react";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "./staff.module.css";

/* ============================================
   CUSTOM ALGORITHM: Crowd Anomaly Detection (F15)
   If zone density increases >2x in <5 min → alert
   ============================================ */
function detectAnomalies(zones) {
  return zones.filter(z => z.density > 0.85 || z.densityChange > 0.3).map(z => ({
    zoneId: z.id,
    type: z.densityChange > 0.3 ? "SURGE" : "OVERCROWDED",
    severity: z.density > 0.9 ? "critical" : "warning",
    message: z.densityChange > 0.3
      ? `Sudden crowd surge in ${z.name} (+${Math.round(z.densityChange * 100)}% in 5 min)`
      : `${z.name} at ${Math.round(z.density * 100)}% capacity — potential bottleneck`,
  }));
}

/* ============================================
   SIMULATED DATA
   ============================================ */
const ZONES = [
  { id: "A", name: "North Stand", capacity: 12000, current: 9800, density: 0.82, densityChange: 0.05, color: "#f9ab00" },
  { id: "B", name: "East Wing", capacity: 8000, current: 7500, density: 0.94, densityChange: 0.35, color: "#d93025" },
  { id: "C", name: "South Stand", capacity: 15000, current: 8200, density: 0.55, densityChange: -0.02, color: "#0d904f" },
  { id: "D", name: "West Wing", capacity: 10000, current: 8900, density: 0.89, densityChange: 0.12, color: "#ea4335" },
  { id: "E", name: "VIP Lounge", capacity: 2000, current: 1100, density: 0.55, densityChange: 0.01, color: "#0d904f" },
  { id: "F", name: "Food Court", capacity: 5000, current: 4200, density: 0.84, densityChange: 0.22, color: "#f9ab00" },
];

const INITIAL_ALERTS = [
  { id: 1, type: "sos", severity: "urgent", title: "Medical Emergency — Section D, Row 14", zone: "West Wing", time: "2 min ago", status: "active", assignedTo: null },
  { id: 2, type: "anomaly", severity: "warning", title: "Crowd surge detected in East Wing (+35%)", zone: "East Wing", time: "5 min ago", status: "active", assignedTo: "Rajesh K." },
  { id: 3, type: "sos", severity: "urgent", title: "Lost child reported near Gate B", zone: "East Wing", time: "8 min ago", status: "dispatched", assignedTo: "Priya M." },
  { id: 4, type: "system", severity: "info", title: "Food Court queue exceeding 20 min wait", zone: "Food Court", time: "12 min ago", status: "active", assignedTo: null },
  { id: 5, type: "sos", severity: "urgent", title: "Altercation reported Section A, Row 22", zone: "North Stand", time: "18 min ago", status: "resolved", assignedTo: "Amit S." },
];

const STAFF_MEMBERS = [
  { id: 1, name: "Rajesh K.", role: "Security Lead", status: "busy", zone: "East Wing" },
  { id: 2, name: "Priya M.", role: "Medical", status: "busy", zone: "East Wing" },
  { id: 3, name: "Amit S.", role: "Security", status: "available", zone: "North Stand" },
  { id: 4, name: "Sneha R.", role: "Operations", status: "available", zone: "South Stand" },
  { id: 5, name: "Vikram P.", role: "Security", status: "available", zone: "West Wing" },
  { id: 6, name: "Neha T.", role: "Medical", status: "offline", zone: "-" },
];

function getZoneColor(density) {
  if (density < 0.5) return "#0d904f";
  if (density < 0.75) return "#f9ab00";
  return "#d93025";
}

/* ============================================
   STAFF HEATMAP COMPONENT (F23)
   ============================================ */
function CrowdHeatmap({ zones }) {
  const zonePositions = [
    { id: "A", cx: 200, cy: 80, rx: 80, ry: 35 },
    { id: "B", cx: 330, cy: 160, rx: 50, ry: 50 },
    { id: "C", cx: 200, cy: 260, rx: 85, ry: 35 },
    { id: "D", cx: 70, cy: 160, rx: 50, ry: 50 },
    { id: "E", cx: 330, cy: 280, rx: 40, ry: 25 },
    { id: "F", cx: 200, cy: 170, rx: 55, ry: 30 },
  ];

  return (
    <div className={styles.heatmapContainer}>
      <svg viewBox="0 0 400 340" className={styles.heatmapSvg}>
        {/* Stadium outline on dark bg */}
        <motion.ellipse
          cx="200" cy="170" rx="180" ry="145"
          fill="none" stroke="#333" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />
        <motion.ellipse
          cx="200" cy="170" rx="130" ry="100"
          fill="none" stroke="#2a2d31" strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />

        {/* Zone heatmap blobs */}
        {zonePositions.map((pos) => {
          const zone = zones.find(z => z.id === pos.id);
          if (!zone) return null;
          const color = getZoneColor(zone.density);
          const hasAnomaly = zone.densityChange > 0.2;

          return (
            <motion.g key={pos.id}>
              {/* Heat blob */}
              <motion.ellipse
                cx={pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry}
                fill={color}
                opacity={0.25 + zone.density * 0.35}
                animate={{
                  opacity: [0.2 + zone.density * 0.3, 0.3 + zone.density * 0.35, 0.2 + zone.density * 0.3],
                  rx: [pos.rx, pos.rx + 3, pos.rx],
                  ry: [pos.ry, pos.ry + 2, pos.ry],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Zone label */}
              <text x={pos.cx} y={pos.cy - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="white" opacity="0.9">
                {zone.name}
              </text>
              <text x={pos.cx} y={pos.cy + 8} textAnchor="middle" fontSize="9" fontWeight="500" fill="white" opacity="0.6">
                {Math.round(zone.density * 100)}% · {zone.current.toLocaleString()}
              </text>
              {/* Anomaly indicator */}
              {hasAnomaly && (
                <motion.circle
                  cx={pos.cx + pos.rx - 5} cy={pos.cy - pos.ry + 5}
                  r="6" fill="#ea4335"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Playing field center */}
        <rect x="165" y="145" width="70" height="50" rx="6" fill="#2a2d31" stroke="#444" strokeWidth="1" />
        <text x="200" y="174" textAnchor="middle" fontSize="8" fill="#666" fontWeight="600">FIELD</text>
      </svg>
    </div>
  );
}

/* ============================================
   MAIN STAFF DASHBOARD PAGE
   ============================================ */
export default function StaffDashboard() {
  const router = useRouter();
  const { user, role, loading, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [zones, setZones] = useState(ZONES);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [staff, setStaff] = useState(STAFF_MEMBERS);

  // Simulate real-time zone updates
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prev => prev.map(z => ({
        ...z,
        current: Math.max(
          0,
          Math.min(z.capacity, z.current + Math.round((Math.random() - 0.45) * 100))
        ),
        density: Math.max(0.1, Math.min(1, z.density + (Math.random() - 0.48) * 0.05)),
        densityChange: Math.max(-0.1, Math.min(0.5, z.densityChange + (Math.random() - 0.5) * 0.05)),
      })));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth?role=staff");
    }
  }, [user, loading, router]);

  const anomalies = detectAnomalies(zones);
  const activeAlerts = alerts.filter(a => a.status !== "resolved");
  const totalAttendees = zones.reduce((sum, z) => sum + z.current, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const overallDensity = totalAttendees / totalCapacity;
  const availableStaff = staff.filter(s => s.status === "available").length;

  const resolveAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" } : a));
  };

  const assignStaff = (alertId, staffName) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, assignedTo: staffName, status: "dispatched" } : a
    ));
    setStaff(prev => prev.map(s =>
      s.name === staffName ? { ...s, status: "busy" } : s
    ));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <motion.div
            style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#34a853", borderRadius: "50%", margin: "0 auto 1rem" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p style={{ color: "#5f6368", fontSize: "0.9rem" }}>Loading staff dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Command Center", icon: <LayoutDashboard size={18} /> },
    { id: "alerts", label: "Alerts", icon: <ShieldAlert size={18} />, badge: activeAlerts.length },
    { id: "zones", label: "Zone Monitor", icon: <Activity size={18} /> },
    { id: "staff", label: "Staff Dispatch", icon: <UserCheck size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  ];

  return (
    <div className={dashStyles.dashboardShell}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className={dashStyles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${dashStyles.sidebar} ${sidebarOpen ? dashStyles.sidebarOpen : ""}`}>
        <div className={dashStyles.sidebarHeader}>
          <div className={dashStyles.sidebarLogoIcon} style={{ background: "#e6f4ea", color: "#137333" }}>
            <ShieldAlert size={18} />
          </div>
          <span className={dashStyles.sidebarLogoText}>
            Venue<span style={{ color: "#137333" }}>IQ</span>
          </span>
        </div>

        <nav className={dashStyles.sidebarNav}>
          <div className={dashStyles.navSectionLabel}>Operations</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`${dashStyles.navItem} ${activeTab === item.id ? dashStyles.navItemActive : ""}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              style={activeTab === item.id ? { background: "#e6f4ea", color: "#137333" } : undefined}
            >
              {item.icon}
              {item.label}
              {item.badge && <span className={dashStyles.navBadge}>{item.badge}</span>}
            </button>
          ))}

          <div className={dashStyles.navSection}>
            <div className={dashStyles.navSectionLabel}>System</div>
            <Link href="/dashboard" className={dashStyles.navItem}>
              <Eye size={18} />
              Fan View
            </Link>
            <button className={dashStyles.navItem}>
              <Settings size={18} />
              Settings
            </button>
          </div>
        </nav>

        <div className={dashStyles.sidebarFooter}>
          <div className={dashStyles.userCard}>
            <div className={dashStyles.userAvatar} style={{ background: "linear-gradient(135deg, #e6f4ea, #d4edda)", color: "#137333" }}>
              {(user?.displayName || "S")[0].toUpperCase()}
            </div>
            <div className={dashStyles.userInfo}>
              <div className={dashStyles.userName}>{user?.displayName || "Staff"}</div>
              <div className={dashStyles.userRole}>Staff / Admin</div>
            </div>
          </div>
          <button className={`${dashStyles.navItem} ${dashStyles.navItemDanger}`} onClick={logout} style={{ marginTop: "0.5rem" }}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={dashStyles.mainContent}>
        <header className={dashStyles.topBar}>
          <div className={dashStyles.topBarLeft}>
            <button className={dashStyles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className={dashStyles.pageTitle}>
              {navItems.find(n => n.id === activeTab)?.label || "Staff Dashboard"}
            </h1>
          </div>
          <div className={dashStyles.topBarRight}>
            <div className={dashStyles.liveIndicator} style={{ background: anomalies.length > 0 ? "#fce8e6" : "#e6f4ea", color: anomalies.length > 0 ? "#c5221f" : "#137333" }}>
              <span className={dashStyles.liveDot} style={{ background: anomalies.length > 0 ? "#d93025" : "#0d904f" }} />
              {anomalies.length > 0 ? `${anomalies.length} Anomalies` : "All Clear"}
            </div>
            <button className={dashStyles.topBarBtn} aria-label="Notifications">
              <Bell size={20} />
              {activeAlerts.length > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  width: 8, height: 8, background: "#ea4335",
                  borderRadius: "50%", border: "2px solid white"
                }} />
              )}
            </button>
          </div>
        </header>

        <div className={dashStyles.pageContent}>
          {/* Quick Stats Bar */}
          <div className={styles.quickStatsBar}>
            <div className={styles.quickStat}>
              <Users size={14} /> Attendees: <span className={styles.quickStatValue}>{totalAttendees.toLocaleString()}</span>
            </div>
            <div className={styles.quickStat}>
              <Activity size={14} /> Overall Density: <span className={styles.quickStatValue}>{Math.round(overallDensity * 100)}%</span>
            </div>
            <div className={styles.quickStat}>
              <ShieldAlert size={14} /> Active Alerts: <span className={styles.quickStatValue} style={{ color: "#d93025" }}>{activeAlerts.length}</span>
            </div>
            <div className={styles.quickStat}>
              <UserCheck size={14} /> Staff Available: <span className={styles.quickStatValue} style={{ color: "#0d904f" }}>{availableStaff}/{staff.length}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={dashStyles.contentGrid}>
                  {/* Heatmap */}
                  <div className={`${dashStyles.colSpan8} ${dashStyles.dashCard}`}>
                    <div className={dashStyles.dashCardHeader}>
                      <h3 className={dashStyles.dashCardTitle}><Radio size={18} /> Live Crowd Heatmap</h3>
                      <span style={{ fontSize: "0.75rem", color: "#80868b" }}>Auto-refreshing every 4s</span>
                    </div>
                    <CrowdHeatmap zones={zones} />
                  </div>

                  {/* Active Alerts */}
                  <div className={`${dashStyles.colSpan4} ${dashStyles.dashCard}`}>
                    <div className={dashStyles.dashCardHeader}>
                      <h3 className={dashStyles.dashCardTitle}><AlertTriangle size={18} /> Active Alerts</h3>
                      <span className={dashStyles.navBadge}>{activeAlerts.length}</span>
                    </div>
                    <div className={dashStyles.dashCardBody}>
                      <div className={styles.alertList}>
                        {alerts.slice(0, 4).map(alert => (
                          <div
                            key={alert.id}
                            className={`${styles.alertItem} ${
                              alert.status === "resolved" ? styles.alertItemResolved :
                              alert.severity === "urgent" ? styles.alertItemUrgent :
                              alert.severity === "warning" ? styles.alertItemWarning :
                              styles.alertItemInfo
                            }`}
                          >
                            <div className={`${styles.alertIcon} ${
                              alert.status === "resolved" ? styles.alertIconResolved :
                              alert.severity === "urgent" ? styles.alertIconUrgent :
                              alert.severity === "warning" ? styles.alertIconWarning :
                              styles.alertIconInfo
                            }`}>
                              {alert.status === "resolved" ? <CheckCircle size={16} /> :
                               alert.severity === "urgent" ? <AlertTriangle size={16} /> :
                               <Zap size={16} />}
                            </div>
                            <div className={styles.alertContent}>
                              <div className={styles.alertTitle}>{alert.title}</div>
                              <div className={styles.alertMeta}>
                                <span>{alert.zone}</span>
                                {alert.assignedTo && <span>→ {alert.assignedTo}</span>}
                              </div>
                            </div>
                            <span className={styles.alertTime}>{alert.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone Status */}
                <div className={dashStyles.dashCard} style={{ marginTop: "1.5rem" }}>
                  <div className={dashStyles.dashCardHeader}>
                    <h3 className={dashStyles.dashCardTitle}><Map size={18} /> Zone Capacity Monitor</h3>
                  </div>
                  <div className={dashStyles.dashCardBody}>
                    <div className={styles.zoneGrid}>
                      {zones.map(zone => {
                        const color = getZoneColor(zone.density);
                        return (
                          <motion.div key={zone.id} className={styles.zoneCard} whileHover={{ y: -2 }}>
                            <div className={styles.zoneHeader}>
                              <span className={styles.zoneName}>{zone.name}</span>
                              <span className={styles.zoneStatusBadge} style={{ background: color + "20", color }}>
                                {Math.round(zone.density * 100)}%
                              </span>
                            </div>
                            <div className={styles.zoneCapacity}>
                              {zone.current.toLocaleString()} / {zone.capacity.toLocaleString()}
                            </div>
                            <div className={styles.zoneBar}>
                              <motion.div
                                className={styles.zoneBarFill}
                                style={{ background: color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${zone.density * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            {zone.densityChange > 0.15 && (
                              <div style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: "#d93025", fontWeight: 600 }}>
                                ⚠️ +{Math.round(zone.densityChange * 100)}% surge
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== ALERTS TAB ===== */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={dashStyles.dashCard}>
                  <div className={dashStyles.dashCardHeader}>
                    <h3 className={dashStyles.dashCardTitle}><ShieldAlert size={18} /> All Alerts</h3>
                  </div>
                  <div className={dashStyles.dashCardBody}>
                    <div className={styles.alertList}>
                      {alerts.map(alert => {
                        const availStaff = staff.filter(s => s.status === "available");
                        return (
                          <div
                            key={alert.id}
                            className={`${styles.alertItem} ${
                              alert.status === "resolved" ? styles.alertItemResolved :
                              alert.severity === "urgent" ? styles.alertItemUrgent :
                              alert.severity === "warning" ? styles.alertItemWarning :
                              styles.alertItemInfo
                            }`}
                          >
                            <div className={`${styles.alertIcon} ${
                              alert.status === "resolved" ? styles.alertIconResolved :
                              alert.severity === "urgent" ? styles.alertIconUrgent :
                              alert.severity === "warning" ? styles.alertIconWarning :
                              styles.alertIconInfo
                            }`}>
                              {alert.status === "resolved" ? <CheckCircle size={16} /> :
                               alert.severity === "urgent" ? <AlertTriangle size={16} /> :
                               <Zap size={16} />}
                            </div>
                            <div className={styles.alertContent}>
                              <div className={styles.alertTitle}>{alert.title}</div>
                              <div className={styles.alertMeta}>
                                <span>{alert.zone}</span>
                                <span>·</span>
                                <span>{alert.status}</span>
                                {alert.assignedTo && <><span>·</span><span>→ {alert.assignedTo}</span></>}
                              </div>
                            </div>
                            <span className={styles.alertTime}>{alert.time}</span>
                            {alert.status !== "resolved" && (
                              <div className={styles.alertActions}>
                                {!alert.assignedTo && availStaff.length > 0 && (
                                  <button
                                    className={`${styles.alertActionBtn} ${styles.alertActionBtnPrimary}`}
                                    onClick={() => assignStaff(alert.id, availStaff[0].name)}
                                  >
                                    Dispatch
                                  </button>
                                )}
                                <button
                                  className={`${styles.alertActionBtn}`}
                                  onClick={() => resolveAlert(alert.id)}
                                >
                                  Resolve
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== ZONES TAB ===== */}
            {activeTab === "zones" && (
              <motion.div key="zones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={dashStyles.dashCard} style={{ marginBottom: "1.5rem" }}>
                  <div className={dashStyles.dashCardHeader}>
                    <h3 className={dashStyles.dashCardTitle}><Radio size={18} /> Live Crowd Heatmap</h3>
                  </div>
                  <CrowdHeatmap zones={zones} />
                </div>

                <div className={dashStyles.dashCard}>
                  <div className={dashStyles.dashCardHeader}>
                    <h3 className={dashStyles.dashCardTitle}><Map size={18} /> Zone Details</h3>
                  </div>
                  <div className={dashStyles.dashCardBody}>
                    <div className={styles.zoneGrid}>
                      {zones.map(zone => {
                        const color = getZoneColor(zone.density);
                        return (
                          <motion.div key={zone.id} className={styles.zoneCard} whileHover={{ y: -2 }}>
                            <div className={styles.zoneHeader}>
                              <span className={styles.zoneName}>{zone.name}</span>
                              <span className={styles.zoneStatusBadge} style={{ background: color + "20", color }}>
                                {Math.round(zone.density * 100)}%
                              </span>
                            </div>
                            <div className={styles.zoneCapacity}>
                              {zone.current.toLocaleString()} / {zone.capacity.toLocaleString()}
                            </div>
                            <div className={styles.zoneBar}>
                              <motion.div
                                className={styles.zoneBarFill}
                                style={{ background: color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${zone.density * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== STAFF DISPATCH TAB ===== */}
            {activeTab === "staff" && (
              <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={dashStyles.contentGrid}>
                  <div className={`${dashStyles.colSpan8} ${dashStyles.dashCard}`}>
                    <div className={dashStyles.dashCardHeader}>
                      <h3 className={dashStyles.dashCardTitle}><UserCheck size={18} /> Staff Members</h3>
                    </div>
                    <div className={dashStyles.dashCardBody}>
                      <div className={styles.dispatchPanel}>
                        {staff.map(member => (
                          <div key={member.id} className={styles.staffMember}>
                            <div className={styles.staffAvatar}>
                              {member.name[0]}
                            </div>
                            <div className={styles.staffInfo}>
                              <div className={styles.staffName}>{member.name}</div>
                              <div className={styles.staffRole}>{member.role} · {member.zone}</div>
                            </div>
                            <div className={`${styles.staffStatusDot} ${
                              member.status === "available" ? styles.staffAvailable :
                              member.status === "busy" ? styles.staffBusy :
                              styles.staffOffline
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`${dashStyles.colSpan4} ${dashStyles.dashCard}`}>
                    <div className={dashStyles.dashCardHeader}>
                      <h3 className={dashStyles.dashCardTitle}><Activity size={18} /> Dispatch Summary</h3>
                    </div>
                    <div className={dashStyles.dashCardBody}>
                      <div className={styles.metricGrid} style={{ gridTemplateColumns: "1fr" }}>
                        <div className={styles.metricCard}>
                          <div className={styles.metricLabel}>Available</div>
                          <div className={styles.metricValue} style={{ color: "#0d904f" }}>{availableStaff}</div>
                          <div className={styles.metricBar}>
                            <div className={styles.metricBarFill} style={{ width: `${(availableStaff / staff.length) * 100}%`, background: "#0d904f" }} />
                          </div>
                        </div>
                        <div className={styles.metricCard}>
                          <div className={styles.metricLabel}>On Assignment</div>
                          <div className={styles.metricValue} style={{ color: "#f9ab00" }}>
                            {staff.filter(s => s.status === "busy").length}
                          </div>
                        </div>
                        <div className={styles.metricCard}>
                          <div className={styles.metricLabel}>Offline</div>
                          <div className={styles.metricValue} style={{ color: "#9aa0a6" }}>
                            {staff.filter(s => s.status === "offline").length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===== ANALYTICS TAB ===== */}
            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={dashStyles.statsRow}>
                  <motion.div className={dashStyles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${dashStyles.statIcon} ${dashStyles.statIconBlue}`}><Users size={20} /></div>
                    <div className={dashStyles.statValue}>{totalAttendees.toLocaleString()}</div>
                    <div className={dashStyles.statLabel}>Total Attendees</div>
                    <div className={`${dashStyles.statChange} ${dashStyles.statChangeUp}`}><TrendingUp size={10} /> +5.2%</div>
                  </motion.div>
                  <motion.div className={dashStyles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${dashStyles.statIcon} ${dashStyles.statIconGreen}`}><Timer size={20} /></div>
                    <div className={dashStyles.statValue}>7.2 min</div>
                    <div className={dashStyles.statLabel}>Avg Response Time</div>
                    <div className={`${dashStyles.statChange} ${dashStyles.statChangeDown}`}><TrendingDown size={10} /> -18%</div>
                  </motion.div>
                  <motion.div className={dashStyles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${dashStyles.statIcon} ${dashStyles.statIconYellow}`}><ShieldAlert size={20} /></div>
                    <div className={dashStyles.statValue}>23</div>
                    <div className={dashStyles.statLabel}>Incidents Today</div>
                  </motion.div>
                  <motion.div className={dashStyles.statCard} whileHover={{ y: -3 }}>
                    <div className={`${dashStyles.statIcon} ${dashStyles.statIconPurple}`}><BarChart3 size={20} /></div>
                    <div className={dashStyles.statValue}>94%</div>
                    <div className={dashStyles.statLabel}>Resolution Rate</div>
                    <div className={`${dashStyles.statChange} ${dashStyles.statChangeUp}`}><TrendingUp size={10} /> +3%</div>
                  </motion.div>
                </div>

                <div className={dashStyles.dashCard}>
                  <div className={dashStyles.dashCardHeader}>
                    <h3 className={dashStyles.dashCardTitle}><BarChart3 size={18} /> Crowd Density Over Time</h3>
                  </div>
                  <div className={dashStyles.dashCardBody}>
                    {/* Simple bar chart visualization */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "200px", padding: "1rem 0" }}>
                      {[35, 42, 55, 68, 82, 90, 88, 75, 65, 58, 72, 85].map((val, i) => {
                        const hours = ["10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm"];
                        const color = val > 80 ? "#d93025" : val > 60 ? "#f9ab00" : "#0d904f";
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${val * 1.8}px` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              style={{
                                width: "100%",
                                background: color,
                                borderRadius: "4px 4px 0 0",
                                opacity: 0.8,
                                minWidth: "20px",
                              }}
                            />
                            <span style={{ fontSize: "0.6rem", color: "#80868b" }}>{hours[i]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
