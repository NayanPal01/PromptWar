"use client";

/**
 * Host Dashboard — VenueIQ (Advanced)
 * 
 * AI-powered event creation. Features:
 * - Gemini AI auto-generates venue architecture from venue name
 * - Shows AI-generated venue details (real gates, zones, capacity)
 * - Host can review and customize before creating
 * - Live attendee tracking (see who checked in)
 * - Event management with real-time stats
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  createEvent, listHostEvents, getEvent,
  onEventGatesSnapshot, onEventStatsSnapshot,
  onEventStallsSnapshot, updateEventGate, updateEventStall,
  deleteEvent, onEventAlertsSnapshot, resolveEventAlert,
} from "@/lib/eventService";
import { onCheckinsSnapshot } from "@/lib/checkinService";
import { generateVenueConfig } from "@/lib/geminiService";
import { VENUE_TEMPLATES } from "@/lib/venueTemplates";
import {
  Plus, Calendar, Users, MapPin, LogOut,
  X, Ticket, BarChart3, Eye, Copy, Check,
  Sparkles, Loader2, ChevronRight, Building2,
  DoorOpen, Utensils, Bath, ArrowRight,
  UserCheck, Clock, AlertTriangle, Trash2, HeartPulse, ShieldAlert, Flame, Baby, CheckCircle
} from "lucide-react";
import styles from "./host.module.css";
import VenueDiagram from "@/components/VenueDiagram";

const LiveMapImpl = dynamic(() => import("@/components/LiveMapImpl"), { ssr: false });

export default function HostDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Create form wizard
  const [createStep, setCreateStep] = useState(1); // 1: basic info, 2: AI generating, 3: review
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    venueName: "",
    date: "",
    expectedAttendees: "",
  });
  const [aiConfig, setAiConfig] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Event detail view
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventCheckins, setEventCheckins] = useState([]);
  const [eventGates, setEventGates] = useState([]);
  const [eventStalls, setEventStalls] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [eventAlerts, setEventAlerts] = useState([]);
  const [deletingEvent, setDeletingEvent] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth?role=host");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.uid) loadEvents();
  }, [user]);

  // Listen to selected event data
  useEffect(() => {
    if (!selectedEvent) return;
    const unsubs = [];
    unsubs.push(onCheckinsSnapshot(selectedEvent.id, setEventCheckins));
    unsubs.push(onEventGatesSnapshot(selectedEvent.id, setEventGates));
    unsubs.push(onEventStallsSnapshot(selectedEvent.id, setEventStalls));
    unsubs.push(onEventStatsSnapshot(selectedEvent.id, (data) => data && setEventStats(data)));
    unsubs.push(onEventAlertsSnapshot(selectedEvent.id, setEventAlerts));
    return () => unsubs.forEach(fn => fn());
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const data = await listHostEvents(user.uid);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Step 1 → 2: Generate AI config
  const handleGenerateAI = async () => {
    if (!formData.eventName || !formData.venueName) return;
    setCreateStep(2);
    setAiLoading(true);
    setAiError("");
    try {
      const config = await generateVenueConfig(
        formData.venueName,
        formData.eventName,
        formData.expectedAttendees
      );
      setAiConfig(config);
      setCreateStep(3);
    } catch (err) {
      console.error("AI generation failed:", err);
      setAiError("AI generation failed. Please try again.");
      setCreateStep(1);
    } finally {
      setAiLoading(false);
    }
  };

  // Step 3 → Create event
  const handleCreate = async () => {
    setCreating(true);
    try {
      await createEvent({
        hostId: user.uid,
        ...formData,
        aiConfig,
      });
      setShowCreateModal(false);
      resetForm();
      await loadEvents();
    } catch (err) {
      console.error("Create event failed:", err);
      alert("Failed to create event. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({ eventName: "", venueName: "", date: "", expectedAttendees: "" });
    setAiConfig(null);
    setCreateStep(1);
    setAiError("");
  };

  const copyCode = (code, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div
          style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#f9ab00", borderRadius: "50%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // ===== Event Detail View =====
  if (selectedEvent) {
    const tmpl = VENUE_TEMPLATES[selectedEvent.template] || VENUE_TEMPLATES.stadium;
    return (
      <div className={styles.hostShell}>
        <nav className={styles.hostNav}>
          <div className={styles.hostLogo}>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", color: "#5f6368", fontSize: "0.85rem" }}
            >
              ← Back to Events
            </button>
          </div>
          <div className={styles.hostNavRight}>
            <button
              className={`${styles.hostNavBtn}`}
              style={{ background: "#fce8e6", color: "#d93025", border: "none" }}
              disabled={deletingEvent}
              onClick={async () => {
                if (!confirm(`Delete "${selectedEvent.eventName}"? This cannot be undone.`)) return;
                setDeletingEvent(true);
                try {
                  await deleteEvent(selectedEvent.id);
                  setSelectedEvent(null);
                  loadEvents();
                } catch (err) {
                  console.error("Delete failed:", err);
                  alert("Failed to delete event.");
                } finally {
                  setDeletingEvent(false);
                }
              }}
            >
              <X size={14} /> {deletingEvent ? "Deleting..." : "Delete Event"}
            </button>
          </div>
        </nav>

        <div className={styles.hostContent}>
          {/* Event Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
            <div>
              <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>{tmpl.icon}</div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#202124" }}>{selectedEvent.eventName}</h1>
              <p style={{ color: "#5f6368", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <MapPin size={14} /> {selectedEvent.venueName}
              </p>
              {selectedEvent.venueDescription && (
                <p style={{ color: "#80868b", fontSize: "0.85rem", marginTop: "0.5rem", maxWidth: "600px" }}>
                  {selectedEvent.venueDescription}
                </p>
              )}
            </div>
            <div className={styles.eventCardCode} onClick={(e) => copyCode(selectedEvent.ticketCode, e)} style={{ cursor: "pointer" }}>
              <Ticket size={12} /> Ticket Code: <strong style={{ fontSize: "1.1rem", letterSpacing: "2px" }}>{selectedEvent.ticketCode}</strong>
              {copiedCode === selectedEvent.ticketCode ? <Check size={12} color="#137333" /> : <Copy size={12} />}
            </div>
          </div>

          {/* Live Stats */}
          <div className={styles.eventsGrid} style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}>
            <div className={styles.eventCard} style={{ cursor: "default", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1a73e8" }}>{eventStats?.totalAttendees || 0}</div>
              <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>Checked In</div>
            </div>
            <div className={styles.eventCard} style={{ cursor: "default", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0d904f" }}>{eventGates.length}</div>
              <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>Active Gates</div>
            </div>
            <div className={styles.eventCard} style={{ cursor: "default", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f9ab00" }}>{selectedEvent.totalCapacity || 0}</div>
              <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>Total Capacity</div>
            </div>
            <div className={styles.eventCard} style={{ cursor: "default", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#d93025" }}>{eventStats?.activeAlerts || 0}</div>
              <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>Active Alerts</div>
            </div>
          </div>

          {/* Gate Status + Attendees */}
          <div className={styles.twoColLayout}>
            {/* Gate Crowd */}
            <div className={styles.eventCard} style={{ cursor: "default" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#202124", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <DoorOpen size={16} /> Gate Crowd (Live)
              </h3>
              {eventGates.length === 0 ? (
                <p style={{ color: "#80868b", fontSize: "0.85rem" }}>No gate data yet</p>
              ) : (
                eventGates.map(gate => {
                  const pct = gate.estimatedCapacityFlow ? Math.round((gate.currentCount || 0) / gate.estimatedCapacityFlow * 100) : 0;
                  const color = pct > 80 ? "#d93025" : pct > 50 ? "#f9ab00" : "#0d904f";
                  return (
                    <div key={gate.id} style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600, color: "#202124" }}>{gate.name}</span>
                        <span style={{ color, fontWeight: 700 }}>{gate.currentCount || 0} checked in</span>
                      </div>
                      <div style={{ height: "6px", background: "#f1f3f4", borderRadius: "3px" }}>
                        <motion.div
                          style={{ height: "100%", background: color, borderRadius: "3px" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Attendee List */}
            <div className={styles.eventCard} style={{ cursor: "default" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#202124", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <UserCheck size={16} /> Attendees ({eventCheckins.length})
              </h3>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {eventCheckins.length === 0 ? (
                  <p style={{ color: "#80868b", fontSize: "0.85rem" }}>No one has checked in yet. Share the ticket code with attendees.</p>
                ) : (
                  eventCheckins.map(checkin => (
                    <div key={checkin.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f3f4" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e8f0fe", color: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                          {(checkin.userName || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#202124" }}>{checkin.userName}</div>
                          <div style={{ fontSize: "0.7rem", color: "#80868b" }}>via {checkin.gateName}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: checkin.status === "inside" ? "#e6f4ea" : "#f1f3f4", color: checkin.status === "inside" ? "#137333" : "#80868b", fontWeight: 600 }}>
                        {checkin.status === "inside" ? "Inside" : "Exited"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* ===== QUEUE OVERVIEW + COUNTER STAFF LINKS ===== */}
          <div className={styles.twoColLayout}>
            
            {/* Gate Wait Time Manager */}
            <div className={styles.eventCard} style={{ cursor: "default" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#202124", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={16} /> Gate Wait Times
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#80868b", marginBottom: "0.75rem" }}>Update estimated wait per gate.</p>
              {eventGates.map(gate => (
                <div key={gate.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: "8px", marginBottom: "0.5rem", border: "1px solid #e8eaed" }}>
                  <div style={{ flex: 2, fontSize: "0.85rem", fontWeight: 600 }}>{gate.name}</div>
                  <input type="number" min="0" max="120" value={gate.waitMin || 0}
                    onChange={async (e) => { await updateEventGate(selectedEvent.id, gate.id, { waitMin: parseInt(e.target.value)||0, crowd: (parseInt(e.target.value)||0) > 20 ? 0.9 : (parseInt(e.target.value)||0) > 10 ? 0.6 : 0.2 }); }}
                    style={{ width: "50px", padding: "0.25rem 0.4rem", borderRadius: "6px", border: "1px solid #dadce0", fontSize: "0.8rem", textAlign: "center" }} />
                  <span style={{ fontSize: "0.7rem", color: "#80868b" }}>min</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "6px",
                    background: (gate.waitMin||0) > 20 ? "#fce8e6" : (gate.waitMin||0) > 10 ? "#fef7e0" : "#e6f4ea",
                    color: (gate.waitMin||0) > 20 ? "#d93025" : (gate.waitMin||0) > 10 ? "#f9ab00" : "#0d904f" }}>
                    {(gate.waitMin||0) > 20 ? "HIGH" : (gate.waitMin||0) > 10 ? "MED" : "LOW"}
                  </span>
                </div>
              ))}
            </div>


          </div>

          {/* ===== EMERGENCY ALERTS ===== */}
          <div className={styles.eventCard} style={{ cursor: "default", marginTop: "1.25rem", border: eventAlerts.filter(a => a.status === "active").length > 0 ? "2px solid #d93025" : "1px solid #e8eaed" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: eventAlerts.filter(a => a.status === "active").length > 0 ? "#d93025" : "#202124", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertTriangle size={16} /> Emergency Alerts
              {eventAlerts.filter(a => a.status === "active").length > 0 && (
                <span style={{ fontSize: "0.7rem", background: "#d93025", color: "white", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: 700, animation: "pulse 1.5s infinite" }}>
                  {eventAlerts.filter(a => a.status === "active").length} ACTIVE
                </span>
              )}
            </h3>
            {eventAlerts.length === 0 ? (
              <p style={{ color: "#80868b", fontSize: "0.85rem", padding: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.3rem" }}><CheckCircle size={16} color="#137333"/> No emergency alerts. All clear!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {eventAlerts.map(al => (
                  <div key={al.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "10px",
                    background: al.status === "active" ? "#fce8e6" : al.status === "dispatched" ? "#fef7e0" : "#f1f3f4",
                    border: `1px solid ${al.status === "active" ? "#f5c6cb" : al.status === "dispatched" ? "#ffeeb8" : "#e8eaed"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {al.sosType === "medical" && <HeartPulse size={20} color="#d93025" />}
                      {al.sosType === "fire" && <Flame size={20} color="#f9ab00" />}
                      {al.sosType === "safety" && <ShieldAlert size={20} color="#d93025" />}
                      {al.sosType === "lost" && <Baby size={20} color="#1a73e8" />}
                      {(!["medical", "fire", "safety", "lost"].includes(al.sosType)) && <AlertTriangle size={20} color="#f9ab00" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#202124" }}>{al.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "#5f6368" }}>
                        {al.createdAt?.toDate ? new Date(al.createdAt.toDate()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                        {al.assignedTo && ` · Assigned: ${al.assignedTo}`}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "6px",
                      background: al.status === "active" ? "#d93025" : al.status === "dispatched" ? "#f9ab00" : "#0d904f",
                      color: "white", textTransform: "uppercase",
                    }}>{al.status}</span>
                    {al.status !== "resolved" && (
                      <button onClick={async () => {
                        try { await resolveEventAlert(selectedEvent.id, al.id); } catch (e) { console.error(e); }
                      }}
                        style={{ padding: "0.25rem 0.5rem", background: "#e6f4ea", color: "#137333", border: "none", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Live Satellite Map */}
          <div className={styles.eventCard} style={{ cursor: "default", marginTop: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#202124", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <MapPin size={16} /> Live Satellite Map — {selectedEvent.venueName}
            </h3>
            <LiveMapImpl checkins={eventCheckins} venueName={selectedEvent.venueName} />
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Events List View =====
  return (
    <div className={styles.hostShell}>
      <nav className={styles.hostNav}>
        <div className={styles.hostLogo}>
          <div className={styles.hostLogoIcon}><MapPin size={16} /></div>
          Venue<span style={{ color: "#f9ab00" }}>IQ</span>
          <span style={{ fontSize: "0.7rem", color: "#80868b", fontWeight: 500, marginLeft: "0.5rem" }}>Host</span>
        </div>
        <div className={styles.hostNavRight}>
          <span style={{ fontSize: "0.85rem", color: "#5f6368" }}>{user?.displayName || user?.email}</span>
          <button className={`${styles.hostNavBtn} ${styles.hostNavBtnGhost}`} onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      <div className={styles.hostContent}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#202124" }}>My Events</h1>
            <p style={{ color: "#5f6368", fontSize: "0.9rem" }}>Create and manage your venue events</p>
          </div>
          <button className={`${styles.hostNavBtn} ${styles.hostNavBtnPrimary}`} onClick={() => { setShowCreateModal(true); resetForm(); }}>
            <Sparkles size={16} /> Create with AI
          </button>
        </div>

        {loadingEvents ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <motion.div
              style={{ width: 40, height: 40, border: "3px solid #e8eaed", borderTopColor: "#f9ab00", borderRadius: "50%", margin: "0 auto" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            <motion.div className={styles.createEventCard} onClick={() => { setShowCreateModal(true); resetForm(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className={styles.createEventCardIcon}><Sparkles size={24} /></div>
              <div className={styles.createEventCardText}>Create with AI</div>
              <div style={{ fontSize: "0.75rem", color: "#80868b" }}>AI generates venue architecture from name</div>
            </motion.div>

            {events.map((event) => {
              const tmpl = VENUE_TEMPLATES[event.template] || VENUE_TEMPLATES.stadium;
              return (
                <motion.div key={event.id} className={styles.eventCard} whileHover={{ y: -3 }} onClick={() => setSelectedEvent(event)}>
                  <div className={styles.eventCardTemplate}>{tmpl.icon}</div>
                  <div className={styles.eventCardName}>{event.eventName}</div>
                  <div className={styles.eventCardVenue}>{event.venueName}</div>
                  {event.venueDescription && (
                    <div style={{ fontSize: "0.75rem", color: "#9aa0a6", marginBottom: "0.5rem", lineHeight: 1.3 }}>
                      {event.venueDescription.slice(0, 100)}...
                    </div>
                  )}
                  <div className={styles.eventCardMeta}>
                    <span><Calendar size={12} /> {event.date || "TBD"}</span>
                    <span><Users size={12} /> {event.expectedAttendees?.toLocaleString() || "0"}</span>
                  </div>
                  <div className={styles.eventCardCode} onClick={(e) => copyCode(event.ticketCode, e)}>
                    <Ticket size={11} /> Code: <strong>{event.ticketCode}</strong>
                    {copiedCode === event.ticketCode ? <Check size={11} color="#137333" /> : <Copy size={11} />}
                  </div>
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <button className={`${styles.hostNavBtn} ${styles.hostNavBtnPrimary}`} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                      <BarChart3 size={12} /> Manage
                    </button>
                    <button className={`${styles.hostNavBtn} ${styles.hostNavBtnGhost}`} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", color: "#d93025" }} 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (window.confirm('Are you sure you want to delete this event? This action will permanently remove all related checkins, orders, and stats.')) {
                          try {
                            await deleteEvent(event.id);
                          } catch (err) {
                            console.error('Failed to delete event:', err);
                            alert('Failed to delete the event.');
                          }
                        }
                      }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== AI-POWERED CREATE EVENT MODAL ===== */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)}>
            <motion.div className={styles.modal} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: createStep === 3 ? "700px" : "560px" }}>
              
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {createStep === 1 && "Create Event"}
                  {createStep === 2 && "🤖 AI Generating..."}
                  {createStep === 3 && "Review Venue Architecture"}
                </h2>
                <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}><X size={16} /></button>
              </div>

              {/* STEP 1: Basic Info */}
              {createStep === 1 && (
                <>
                  <div className={styles.modalBody}>
                    <div style={{ padding: "0.75rem", background: "#f0e6ff", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <Sparkles size={16} color="#7c3aed" />
                      <span style={{ fontSize: "0.8rem", color: "#5b21b6", fontWeight: 600 }}>
                        AI will auto-generate venue architecture from the venue name
                      </span>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Event Name *</label>
                      <input className={styles.formInput} placeholder="e.g., IPL 2026 — KKR vs MI" value={formData.eventName} onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))} />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Venue Location *</label>
                      <select 
                        className={styles.formInput} 
                        value={formData.venueName === "Custom" || !["", "Eden Gardens, Kolkata", "Salt Lake Stadium, Kolkata", "Netaji Indoor Stadium, Kolkata", "Wankhede Stadium, Mumbai", "Narendra Modi Stadium, Ahmedabad"].includes(formData.venueName) ? "Custom" : formData.venueName}
                        onChange={(e) => {
                          if (e.target.value !== "Custom") {
                            setFormData(prev => ({ ...prev, venueName: e.target.value }));
                          } else {
                            setFormData(prev => ({ ...prev, venueName: "Custom Venue Name" }));
                          }
                        }}
                      >
                        <option value="">-- Select an Indian Venue --</option>
                        <option value="Eden Gardens, Kolkata">Eden Gardens, Kolkata</option>
                        <option value="Salt Lake Stadium, Kolkata">Salt Lake Stadium (Yuba Bharati Krirangan), Kolkata</option>
                        <option value="Netaji Indoor Stadium, Kolkata">Netaji Indoor Stadium, Kolkata</option>
                        <option value="Wankhede Stadium, Mumbai">Wankhede Stadium, Mumbai</option>
                        <option value="Narendra Modi Stadium, Ahmedabad">Narendra Modi Stadium, Ahmedabad</option>
                        <option value="Custom">Other (Custom Location)</option>
                      </select>
                      
                      {(!["", "Eden Gardens, Kolkata", "Salt Lake Stadium, Kolkata", "Netaji Indoor Stadium, Kolkata", "Wankhede Stadium, Mumbai", "Narendra Modi Stadium, Ahmedabad"].includes(formData.venueName) || formData.venueName === "Custom") && (
                        <input 
                          className={styles.formInput} 
                          style={{ marginTop: "0.5rem" }}
                          placeholder="Enter custom venue name (e.g., Dhono Dhanya Auditorium)" 
                          value={formData.venueName === "Custom Venue Name" ? "" : formData.venueName} 
                          onChange={(e) => setFormData(prev => ({ ...prev, venueName: e.target.value }))} 
                          autoFocus
                        />
                      )}
                    </div>

                    <div className={styles.twoColLayout} style={{ gap: "1rem" }}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date & Time</label>
                        <input className={styles.formInput} type="datetime-local" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Expected Attendees</label>
                        <input className={styles.formInput} type="number" placeholder="e.g., 30000" value={formData.expectedAttendees} onChange={(e) => setFormData(prev => ({ ...prev, expectedAttendees: e.target.value }))} />
                      </div>
                    </div>

                    {aiError && (
                      <div style={{ padding: "0.5rem", background: "#fce8e6", borderRadius: "8px", color: "#c5221f", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <AlertTriangle size={14} /> {aiError}
                      </div>
                    )}
                  </div>
                  <div className={styles.modalFooter}>
                    <button className={styles.btnSecondary} onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={handleGenerateAI} disabled={!formData.eventName || !formData.venueName || !formData.date} style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Sparkles size={16} /> Generate with AI
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: AI Loading */}
              {createStep === 2 && (
                <div className={styles.modalBody} style={{ textAlign: "center", padding: "3rem" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ width: 60, height: 60, margin: "0 auto 1.5rem" }}>
                    <Sparkles size={60} color="#7c3aed" />
                  </motion.div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#202124", marginBottom: "0.5rem" }}>
                    Generating venue architecture...
                  </h3>
                  <p style={{ color: "#5f6368", fontSize: "0.85rem" }}>
                    AI is searching for <strong>{formData.venueName}</strong> and generating gates, zones, food stalls, and restrooms.
                  </p>
                  <motion.div style={{ width: "200px", height: "4px", background: "#e8eaed", borderRadius: "2px", margin: "1.5rem auto 0", overflow: "hidden" }}>
                    <motion.div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, #7c3aed, #4f46e5)", borderRadius: "2px" }} animate={{ x: ["-100%", "350%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                  </motion.div>
                </div>
              )}

              {/* STEP 3: Review AI Config */}
              {createStep === 3 && aiConfig && (
                <>
                  <div className={styles.modalBody} style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    {/* Venue Description */}
                    {aiConfig.venueDescription && (
                      <div style={{ padding: "0.75rem", background: "#e8f0fe", borderRadius: "10px", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1a73e8", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Sparkles size={12} /> AI-Generated Description
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#202124", lineHeight: 1.4, margin: 0 }}>{aiConfig.venueDescription}</p>
                      </div>
                    )}
                    
                    {/* Architecture Diagram */}
                    {aiConfig.diagram && (
                      <VenueDiagram diagramString={aiConfig.diagram} />
                    )}

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div style={{ textAlign: "center", padding: "0.75rem", background: "#f1f3f4", borderRadius: "10px" }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a73e8" }}>{aiConfig.totalCapacity?.toLocaleString() || "—"}</div>
                        <div style={{ fontSize: "0.7rem", color: "#5f6368" }}>Total Capacity</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "0.75rem", background: "#f1f3f4", borderRadius: "10px" }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0d904f" }}>{aiConfig.emergencyExits || "—"}</div>
                        <div style={{ fontSize: "0.7rem", color: "#5f6368" }}>Emergency Exits</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "0.75rem", background: "#f1f3f4", borderRadius: "10px" }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f9ab00" }}>{aiConfig.parkingCapacity?.toLocaleString() || "—"}</div>
                        <div style={{ fontSize: "0.7rem", color: "#5f6368" }}>Parking Spots</div>
                      </div>
                    </div>

                    {/* Gates */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <DoorOpen size={14} /> Gates ({aiConfig.gates?.length || 0})
                        </h4>
                        <button 
                          className={styles.hostNavBtnGhost} 
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", borderRadius: "4px" }}
                          onClick={() => setAiConfig(prev => ({ ...prev, gates: [...(prev.gates||[]), { name: "New Gate", section: "General", estimatedCapacityFlow: 1000 }] }))}
                        >
                          + Add Gate
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                        {(aiConfig.gates || []).map((g, i) => (
                          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "#f8f9fa", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e8eaed" }}>
                            <input 
                              className={styles.formInput} 
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", flex: 1.5 }} 
                              value={g.name} 
                              onChange={e => {
                                const newGates = [...aiConfig.gates];
                                newGates[i].name = e.target.value;
                                setAiConfig({...aiConfig, gates: newGates});
                              }}
                            />
                            <input 
                              className={styles.formInput} 
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", flex: 1 }} 
                              placeholder="Section"
                              value={g.section} 
                              onChange={e => {
                                const newGates = [...aiConfig.gates];
                                newGates[i].section = e.target.value;
                                setAiConfig({...aiConfig, gates: newGates});
                              }}
                            />
                            <button 
                              onClick={() => {
                                const newGates = aiConfig.gates.filter((_, idx) => idx !== i);
                                setAiConfig({...aiConfig, gates: newGates});
                              }}
                              style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer", padding: "0.2rem" }}
                              title="Remove Gate"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Zones */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Building2 size={14} /> Zones ({aiConfig.zones?.length || 0})
                        </h4>
                        <button 
                          className={styles.hostNavBtnGhost} 
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", borderRadius: "4px" }}
                          onClick={() => setAiConfig(prev => ({ ...prev, zones: [...(prev.zones||[]), { name: "New Zone", capacity: 500 }] }))}
                        >
                          + Add Zone
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                        {(aiConfig.zones || []).map((z, i) => (
                          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "#f8f9fa", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e8eaed" }}>
                            <input 
                              className={styles.formInput} 
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", flex: 2 }} 
                              value={z.name} 
                              onChange={e => {
                                const newZones = [...aiConfig.zones];
                                newZones[i].name = e.target.value;
                                setAiConfig({...aiConfig, zones: newZones});
                              }}
                            />
                            <input 
                              type="number"
                              className={styles.formInput} 
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", flex: 1 }} 
                              placeholder="Capacity"
                              value={z.capacity} 
                              onChange={e => {
                                const newZones = [...aiConfig.zones];
                                newZones[i].capacity = parseInt(e.target.value) || 0;
                                setAiConfig({...aiConfig, zones: newZones});
                              }}
                            />
                            <button 
                              onClick={() => {
                                const newZones = aiConfig.zones.filter((_, idx) => idx !== i);
                                setAiConfig({...aiConfig, zones: newZones});
                              }}
                              style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer", padding: "0.2rem" }}
                              title="Remove Zone"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Restrooms */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Bath size={14} /> Restrooms ({aiConfig.restrooms?.length || 0})
                          </h4>
                          <button 
                            className={styles.hostNavBtnGhost} 
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", borderRadius: "4px" }}
                            onClick={() => setAiConfig(prev => ({ ...prev, restrooms: [...(prev.restrooms||[]), { name: "New Restroom", type: "restroom", counters: 5, accessible: true, icon: "🚻" }] }))}
                          >
                            + Add Restroom
                          </button>
                        </div>
                        {(aiConfig.restrooms || []).map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center", padding: "0.4rem 0.6rem", background: "#f8f9fa", borderRadius: "6px", marginBottom: "0.35rem", border: "1px solid #e8eaed" }}>
                            <span style={{ fontSize: "1rem" }}>🚻</span>
                            <input 
                              className={styles.formInput} 
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", flex: 2 }} 
                              value={r.name} 
                              onChange={e => {
                                const arr = [...aiConfig.restrooms];
                                arr[i].name = e.target.value;
                                setAiConfig({...aiConfig, restrooms: arr});
                              }}
                            />
                            <input 
                              type="number"
                              className={styles.formInput} 
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", flex: 1 }} 
                              value={r.counters} 
                              onChange={e => {
                                const arr = [...aiConfig.restrooms];
                                arr[i].counters = parseInt(e.target.value) || 1;
                                setAiConfig({...aiConfig, restrooms: arr});
                              }}
                            />
                            <button 
                              onClick={() => {
                                const arr = aiConfig.restrooms.filter((_, idx) => idx !== i);
                                setAiConfig({...aiConfig, restrooms: arr});
                              }}
                              style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer", padding: "0.1rem" }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    <button className={styles.btnSecondary} onClick={() => setCreateStep(1)}>← Edit Details</button>
                    <button className={styles.btnPrimary} onClick={handleCreate} disabled={creating} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {creating ? <><Loader2 size={16} className="spin" /> Creating...</> : <><Check size={16} /> Create Event</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
