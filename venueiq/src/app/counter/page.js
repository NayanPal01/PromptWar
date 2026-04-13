"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getEvent, getStall, onStallOrdersSnapshot, updateOrderStatus,
} from "@/lib/eventService";
import {
  ChefHat, Clock, CheckCircle, Package, AlertTriangle, RefreshCw, X
} from "lucide-react";

const STATUS_FLOW = {
  queued: { label: "Queued", color: "#f9ab00", bg: "#fef7e0", next: "preparing", nextLabel: "Start Preparing" },
  preparing: { label: "Preparing", color: "#1a73e8", bg: "#e8f0fe", next: "ready", nextLabel: "Mark Ready" },
  ready: { label: "Ready", color: "#0d904f", bg: "#e6f4ea", next: "collected", nextLabel: "Collected" },
  collected: { label: "Collected", color: "#80868b", bg: "#f1f3f4", next: null, nextLabel: null },
  cancelled: { label: "Cancelled", color: "#d93025", bg: "#fce8e6", next: null, nextLabel: null },
};

function CounterApp() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const stallId = searchParams.get("stallId");

  const [event, setEvent] = useState(null);
  const [stall, setStall] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active | all

  useEffect(() => {
    if (!eventId || !stallId) return;
    (async () => {
      try {
        const [ev, st] = await Promise.all([getEvent(eventId), getStall(eventId, stallId)]);
        setEvent(ev);
        setStall(st);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [eventId, stallId]);

  useEffect(() => {
    if (!eventId || !stallId) return;
    const unsub = onStallOrdersSnapshot(eventId, stallId, setOrders);
    return () => unsub();
  }, [eventId, stallId]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(eventId, orderId, newStatus);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const activeOrders = orders.filter(o => o.status === "queued" || o.status === "preparing" || o.status === "ready");
  const displayOrders = filter === "active" ? activeOrders : orders;

  const queuedCount = orders.filter(o => o.status === "queued").length;
  const preparingCount = orders.filter(o => o.status === "preparing").length;
  const readyCount = orders.filter(o => o.status === "ready").length;
  const completedCount = orders.filter(o => o.status === "collected").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa" }}>
        <motion.div style={{ width: 48, height: 48, border: "3px solid #e8eaed", borderTopColor: "#f9ab00", borderRadius: "50%" }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (!event || !stall) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fa", flexDirection: "column", gap: "1rem" }}>
        <AlertTriangle size={48} color="#d93025" />
        <h2 style={{ color: "#202124" }}>Invalid Counter Link</h2>
        <p style={{ color: "#5f6368" }}>Please get a valid counter access link from the event host.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Inter', 'Google Sans', sans-serif" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e8eaed", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #f9ab00, #e8710a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChefHat size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#202124" }}>{stall.icon} {stall.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#5f6368" }}>{event.eventName} · {event.venueName}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", background: "#e8f0fe", color: "#1a73e8", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: 600 }}>
            Counter Staff Portal
          </span>
        </div>
      </header>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Queued", count: queuedCount, color: "#f9ab00", bg: "#fef7e0", icon: <Clock size={18} /> },
            { label: "Preparing", count: preparingCount, color: "#1a73e8", bg: "#e8f0fe", icon: <RefreshCw size={18} /> },
            { label: "Ready", count: readyCount, color: "#0d904f", bg: "#e6f4ea", icon: <Package size={18} /> },
            { label: "Completed", count: completedCount, color: "#80868b", bg: "#f1f3f4", icon: <CheckCircle size={18} /> },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: "1rem", textAlign: "center", border: `1.5px solid ${s.bg}` }}>
              <div style={{ color: s.color, marginBottom: "0.3rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: "0.75rem", color: "#5f6368", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#202124" }}>Orders</h2>
          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #dadce0" }}>
            {["active", "all"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", fontWeight: 600, border: "none", cursor: "pointer",
                  background: filter === f ? "#1a73e8" : "#f8f9fa", color: filter === f ? "white" : "#5f6368", textTransform: "capitalize" }}>
                {f === "active" ? `Active (${activeOrders.length})` : `All (${orders.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {displayOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#80868b" }}>
            <Package size={48} strokeWidth={1} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>No orders yet. Orders will appear here when attendees place them.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <AnimatePresence>
              {displayOrders.map(order => {
                const statusInfo = STATUS_FLOW[order.status] || STATUS_FLOW.queued;
                return (
                  <motion.div key={order.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                    style={{ background: "white", borderRadius: "12px", border: `1.5px solid ${statusInfo.bg}`, padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    
                    {/* Order ID */}
                    <div style={{ minWidth: "80px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#202124", letterSpacing: "1px" }}>#{order.orderId}</div>
                      <div style={{ fontSize: "0.65rem", color: "#80868b" }}>
                        {order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "..."}
                      </div>
                    </div>

                    {/* Order details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#202124" }}>{order.userName}</div>
                      {order.items?.length > 0 && (
                        <div style={{ fontSize: "0.8rem", color: "#5f6368", marginTop: "0.15rem" }}>
                          {order.items.join(", ")}
                        </div>
                      )}
                      {order.notes && <div style={{ fontSize: "0.75rem", color: "#80868b", fontStyle: "italic" }}>{order.notes}</div>}
                    </div>

                    {/* Status badge */}
                    <div style={{ padding: "0.25rem 0.6rem", borderRadius: "8px", background: statusInfo.bg, color: statusInfo.color, fontSize: "0.75rem", fontWeight: 700 }}>
                      {statusInfo.label}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {statusInfo.next && (
                        <button onClick={() => handleStatusUpdate(order.id, statusInfo.next)}
                          style={{ padding: "0.35rem 0.7rem", background: statusInfo.next === "collected" ? "#0d904f" : "#1a73e8", color: "white",
                            border: "none", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                          {statusInfo.nextLabel}
                        </button>
                      )}
                      {order.status === "queued" && (
                        <button onClick={() => handleStatusUpdate(order.id, "cancelled")}
                          style={{ padding: "0.35rem 0.5rem", background: "#fce8e6", color: "#d93025",
                            border: "none", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CounterPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
      <CounterApp />
    </Suspense>
  );
}
