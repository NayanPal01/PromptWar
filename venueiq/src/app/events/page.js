"use client";

/**
 * Event Browser — VenueIQ
 * 
 * Attendees search/browse events and join with a ticket code.
 * After joining, they get redirected to the event's live dashboard.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { listEvents, joinEvent, checkEventAccess } from "@/lib/eventService";
import { VENUE_TEMPLATES } from "@/lib/venueTemplates";
import {
  Search, MapPin, Calendar, Users, Ticket, ArrowRight,
  LogOut, ChevronRight, AlertTriangle, Check, X
} from "lucide-react";
import styles from "./events.module.css";

export default function EventBrowser() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [search, setSearch] = useState("");
  const [joinModal, setJoinModal] = useState(null); // event object or null
  const [ticketCode, setTicketCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const data = await listEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleJoin = async () => {
    if (!joinModal || !ticketCode.trim()) {
      setJoinError("Please enter the ticket code");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      await joinEvent(user.uid, joinModal.id, ticketCode.trim().toUpperCase());
      router.push(`/dashboard?eventId=${joinModal.id}`);
    } catch (err) {
      setJoinError(err.message || "Failed to join event");
    } finally {
      setJoining(false);
    }
  };

  const handleDirectAccess = async (event) => {
    // Check if already has access
    if (user?.uid) {
      const hasAccess = await checkEventAccess(user.uid, event.id);
      if (hasAccess) {
        router.push(`/dashboard?eventId=${event.id}`);
        return;
      }
    }
    setJoinModal(event);
    setTicketCode("");
    setJoinError("");
  };

  const filtered = events.filter(e =>
    (e.eventName || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.venueName || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div
          style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className={styles.browserShell}>
      {/* Nav */}
      <nav className={styles.browserNav}>
        <div className={styles.browserLogo}>
          <div className={styles.browserLogoIcon}><MapPin size={16} /></div>
          Venue<span style={{ color: "#1a73e8" }}>IQ</span>
        </div>
        <div className={styles.browserNavRight}>
          <span style={{ fontSize: "0.85rem", color: "#5f6368" }}>{user?.displayName || user?.email}</span>
          <button className={styles.navBtn} onClick={logout}><LogOut size={16} /></button>
        </div>
      </nav>

      {/* Hero */}
      <div className={styles.hero}>
        <motion.h1
          className={styles.heroTitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Find Your Event
        </motion.h1>
        <motion.p
          className={styles.heroDesc}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Search for an event and enter your ticket code to access real-time venue intelligence.
        </motion.p>

        {/* Search */}
        <motion.div
          className={styles.searchContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by event or venue name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>
      </div>

      {/* Event List */}
      <div className={styles.eventsContainer}>
        {loadingEvents ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <motion.div
              style={{ width: 40, height: 40, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", margin: "0 auto" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <h3 style={{ color: "#202124", fontWeight: 700 }}>No events found</h3>
            <p style={{ color: "#5f6368", fontSize: "0.9rem" }}>
              {search ? "Try a different search term" : "No active events are available right now"}
            </p>
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {filtered.map((event, i) => {
              const tmpl = VENUE_TEMPLATES[event.template] || VENUE_TEMPLATES.stadium;
              return (
                <motion.div
                  key={event.id}
                  className={styles.eventCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleDirectAccess(event)}
                >
                  <div className={styles.eventCardTop}>
                    <span className={styles.eventCardIcon}>{tmpl.icon}</span>
                    <span className={styles.eventCardType}>{tmpl.name}</span>
                  </div>
                  <h3 className={styles.eventCardTitle}>{event.eventName}</h3>
                  <p className={styles.eventCardVenue}>
                    <MapPin size={13} /> {event.venueName}
                  </p>
                  <div className={styles.eventCardMeta}>
                    {event.date && <span><Calendar size={12} /> {new Date(event.date).toLocaleDateString()}</span>}
                    <span><Users size={12} /> {event.expectedAttendees?.toLocaleString() || "—"} expected</span>
                  </div>
                  <div className={styles.eventCardAction}>
                    Enter Event <ArrowRight size={14} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Modal */}
      <AnimatePresence>
        {joinModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setJoinModal(null)}
          >
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={() => setJoinModal(null)}><X size={16} /></button>
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                  {(VENUE_TEMPLATES[joinModal.template] || VENUE_TEMPLATES.stadium).icon}
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#202124" }}>{joinModal.eventName}</h3>
                <p style={{ fontSize: "0.85rem", color: "#5f6368" }}>{joinModal.venueName}</p>
              </div>

              <div className={styles.ticketInputGroup}>
                <Ticket size={18} className={styles.ticketIcon} />
                <input
                  className={styles.ticketInput}
                  placeholder="Enter ticket code (e.g., ABC123)"
                  value={ticketCode}
                  onChange={(e) => { setTicketCode(e.target.value.toUpperCase()); setJoinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  autoFocus
                />
              </div>

              {joinError && (
                <motion.div
                  className={styles.errorMsg}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertTriangle size={14} /> {joinError}
                </motion.div>
              )}

              <button
                className={styles.joinBtn}
                onClick={handleJoin}
                disabled={joining || !ticketCode.trim()}
              >
                {joining ? "Verifying..." : "Join Event"}
                {!joining && <ArrowRight size={16} />}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9aa0a6", marginTop: "1rem" }}>
                Ask the event host for the ticket code to gain access.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
