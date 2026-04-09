"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Timer, ShieldAlert, Map, Sparkles, Accessibility } from "lucide-react";
import styles from "./page.module.css";

/* ---- Reusable Motion Components ---- */
const FadeIn = ({ children, delay = 0, duration = 0.6 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration, delay, type: "spring", bounce: 0.2 }}
  >
    {children}
  </motion.div>
);

const AnimatedStadiumSVG = () => {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, padding: "2rem" }}>
      <motion.svg width="100%" height="100%" viewBox="0 0 400 300" fill="none">
        {/* Stadium outline drawn slowly */}
        <motion.ellipse 
          cx="200" cy="150" rx="180" ry="120" 
          stroke="#e8eaed" strokeWidth="4" 
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.ellipse 
          cx="200" cy="150" rx="130" ry="80" 
          stroke="#f1f3f4" strokeWidth="2" 
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
        />
        {/* Animated heat zones */}
        <motion.circle cx="120" cy="150" r="40" fill="#34a853" opacity="0.2"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.circle cx="280" cy="120" r="50" fill="#ea4335" opacity="0.2"
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 1 }}
        />
        <motion.circle cx="200" cy="220" r="35" fill="#fbbc04" opacity="0.2"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
        />
        
        {/* Animated connection lines (data flowing) */}
        <motion.path 
          d="M 200 150 Q 250 100 280 120" 
          stroke="#1a73e8" strokeWidth="3" strokeDasharray="5 5" fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.path 
          d="M 200 150 Q 150 180 120 150" 
          stroke="#1a73e8" strokeWidth="3" strokeDasharray="5 5" fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
      </motion.svg>
    </div>
  );
};

/* ---- Animated Cartoon SVG Components ---- */
const CartoonRobot = () => (
  <motion.svg width="120" height="120" viewBox="0 0 100 100" style={{ position: "absolute", bottom: -10, right: 10 }}>
    <motion.g animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
      {/* Robot Antenna */}
      <line x1="50" y1="30" x2="50" y2="15" stroke="#9333ea" strokeWidth="3" />
      <motion.circle cx="50" cy="15" r="4" fill="#d8b4fe" animate={{ scale: [1, 1.3, 1], fill: ["#d8b4fe", "#a855f7", "#d8b4fe"] }} transition={{ duration: 1.5, repeat: Infinity }} />
      {/* Robot Body */}
      <rect x="25" y="30" width="50" height="40" rx="12" fill="#faf5ff" stroke="#a855f7" strokeWidth="3" />
      {/* Eyes */}
      <motion.circle cx="40" cy="45" r="4" fill="#9333ea" animate={{ scaleY: [1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 1] }} />
      <motion.circle cx="60" cy="45" r="4" fill="#9333ea" animate={{ scaleY: [1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 1] }} />
      {/* Smile */}
      <path d="M40 55 Q50 62 60 55" stroke="#9333ea" strokeWidth="3" fill="none" strokeLinecap="round" />
    </motion.g>
    {/* Floating Sparkles */}
    <motion.path d="M10 30 L15 20 L20 30 L10 30" fill="#d8b4fe" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: -20, x: -10 }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.path d="M80 40 L85 30 L90 40 L80 40" fill="#d8b4fe" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: -30, x: 10 }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
  </motion.svg>
);

const CartoonMaze = () => (
  <motion.svg width="140" height="100" viewBox="0 0 140 100" style={{ position: "absolute", bottom: 0, right: 10 }}>
    {/* Long red path (slow) */}
    <path d="M20 80 L20 60 L80 60 L80 40 L40 40 L40 20 L100 20" stroke="#fecaca" strokeWidth="4" fill="none" strokeLinejoin="round" />
    {/* Short green path (fast) */}
    <path d="M20 80 L100 80 L100 20" stroke="#bbf7d0" strokeWidth="4" strokeDasharray="6 4" fill="none" strokeLinejoin="round" />
    {/* The Fan character (dot) moving on the fast path */}
    <motion.circle r="6" fill="#16a34a"
      animate={{ 
        cx: [20, 100, 100], 
        cy: [80, 80, 20] 
      }} 
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    <motion.path d="M100 15 L95 20 L105 20 Z" fill="#16a34a" animate={{ y: [-2, 2, -2] }} transition={{ duration: 1, repeat: Infinity }} />
  </motion.svg>
);

const CartoonRadar = () => (
  <motion.svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", bottom: -5, right: 0 }}>
    <circle cx="60" cy="60" r="50" fill="none" stroke="#fecaca" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="60" cy="60" r="30" fill="none" stroke="#fca5a5" strokeWidth="2" />
    <circle cx="60" cy="60" r="4" fill="#dc2626" />
    {/* Radar sweep */}
    <motion.path 
      d="M60 60 L60 10 A50 50 0 0 1 110 60 Z" 
      fill="url(#radarGrad)" 
      animate={{ rotate: 360 }} 
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }} 
      style={{ originX: "50%", originY: "50%" }}
    />
    {/* Blinking alert dot */}
    <motion.circle cx="85" cy="35" r="4" fill="#dc2626" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.2, 1] }} />
    <defs>
      <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </linearGradient>
    </defs>
  </motion.svg>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -100]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 150]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.landing}>
      {/* ===== Top Bar ===== */}
      <header className={`${styles.topBar} ${scrolled ? styles.topBarScrolled : ""}`}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIconWrapper}>
            <Map size={24} />
          </div>
          <span className={styles.logoText}>Venue<span className={styles.logoTextAccent}>IQ</span></span>
        </Link>
        
        <nav className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#intelligence" className={styles.navLink}>Intelligence</a>
          <a href="#technology" className={styles.navLink}>Technology</a>
        </nav>

        <div className={styles.topBarActions}>
          <Link href="/auth" className={styles.btnSecondary}>Sign In</Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/auth" className={styles.btnPrimary}>Get Started</Link>
          </motion.div>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className={styles.hero}>
        {/* Background Decorative Shapes */}
        <motion.div 
          className={styles.bgShape} 
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 1.5, type: "spring" }}
          style={{ y: y1, position: "absolute", top: "10%", left: "5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, #e8f0fe 0%, transparent 70%)", zIndex: 0 }}
        />
        <motion.div 
          className={styles.bgShape}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.5, type: "spring", delay: 0.2 }}
          style={{ y: y2, position: "absolute", bottom: "10%", right: "5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #fce8e6 0%, transparent 70%)", zIndex: 0 }}
        />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <FadeIn delay={0.1}>
            <div className={styles.badge}>
              <span className={styles.liveIndicator}></span>
              Live at 50,000+ capacity venues
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className={styles.heroTitle}>
              Build better <br />
              venue experiences <br />
              <span className={styles.gradientText}>with AI.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className={styles.heroDescription}>
              The end-to-end intelligence platform for large-scale sporting and entertainment venues. Say goodbye to blind spots and endless queues.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className={styles.heroRoleCards}>
              <Link href="/auth" className={`${styles.roleCard} ${styles.roleCardFan}`}>
                <motion.div className={`${styles.roleIconWrapper} ${styles.fanIcon}`} whileHover={{ rotate: 10, scale: 1.1 }}>
                  <Users size={24} />
                </motion.div>
                <h3 className={styles.roleTitle}>I'm a Fan</h3>
                <p className={styles.roleDesc}>Get guided routing & wait time insights.</p>
              </Link>
              
              <Link href="/auth?role=staff" className={`${styles.roleCard} ${styles.roleCardStaff}`}>
                <motion.div className={`${styles.roleIconWrapper} ${styles.staffIcon}`} whileHover={{ rotate: -10, scale: 1.1 }}>
                  <ShieldAlert size={24} />
                </motion.div>
                <h3 className={styles.roleTitle}>I'm Staff</h3>
                <p className={styles.roleDesc}>Monitor crowds & respond to anomalies.</p>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== Features Bento Grid ===== */}
      <section className={styles.featuresSection} id="features">
        <FadeIn>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Intelligence at Scale</h2>
          </div>
        </FadeIn>

        <div className={styles.bentoGrid}>
          {/* Card 1 - Crowd Heatmap */}
          <motion.div 
            className={`${styles.bentoItem} ${styles.bentoLarge} ${styles.bgDark}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.2 }}
            whileHover={{ scale: 0.98 }}
          >
            <div className={styles.bentoContent}>
              <h3 className={styles.bentoTitle}>Real-time Digital Twin</h3>
              <p className={styles.bentoDesc}>A high-fidelity digital mirror of your stadium. See live density, anomalies, and active alerts instantly.</p>
            </div>
            {/* Minimal Dashboard SVG Animation inside the dark card */}
            <AnimatedStadiumSVG />
          </motion.div>

          {/* Card 2 - Queue Prediction */}
          <motion.div 
            className={`${styles.bentoItem} ${styles.bgGreen}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.2, delay: 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div className={styles.bentoContent}>
              <Timer size={32} color="#137333" style={{ marginBottom: "1rem" }} />
              <h3 className={styles.bentoTitle}>Smart Queuing</h3>
              <p className={styles.bentoDesc}>Predict wait times for food and restrooms to avoid traffic.</p>
            </div>
            <CartoonMaze />
          </motion.div>

          {/* Card 3 - AI Assistant */}
          <motion.div 
            className={`${styles.bentoItem} ${styles.bgPurple}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.2, delay: 0.2 }}
            whileHover={{ y: -5 }}
          >
            <div className={styles.bentoContent}>
              <Sparkles size={32} color="#9333ea" style={{ marginBottom: "1rem" }} />
              <h3 className={styles.bentoTitle}>Venue Assistant</h3>
              <p className={styles.bentoDesc}>Ask questions. Powered by Gemini.</p>
            </div>
            <CartoonRobot />
          </motion.div>

          {/* Card 4 - Safety */}
          <motion.div 
            className={`${styles.bentoItem} ${styles.bgRed}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.2, delay: 0.3 }}
            whileHover={{ y: -5 }}
          >
            <div className={styles.bentoContent}>
              <ShieldAlert size={32} color="#c5221f" style={{ marginBottom: "1rem" }} />
              <h3 className={styles.bentoTitle}>Auto SOS</h3>
              <p className={styles.bentoDesc}>Emergency alerts to dispatch staff instantly.</p>
            </div>
            <CartoonRadar />
          </motion.div>

          {/* Card 5 - Accessibility */}
          <motion.div 
            className={`${styles.bentoItem} ${styles.bgBlue}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.2, delay: 0.4 }}
            whileHover={{ y: -5 }}
          >
            <div className={styles.bentoContent}>
              <Accessibility size={32} color="#1a73e8" style={{ marginBottom: "1rem" }} />
              <h3 className={styles.bentoTitle}>Accessible Paths</h3>
              <p className={styles.bentoDesc}>Custom routing for wheelchairs avoiding steep grades.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Twin Details Section ===== */}
      <section className={styles.twinSection}>
        <div className={styles.twinContainer}>
          <FadeIn>
            <div>
              <h2 className={styles.twinTitle}>Surgical precision in operations.</h2>
              <p className={styles.twinDesc}>
                Whether you need to clear a bottleneck at Gate C or redirect fans to a less busy restroom, VenueIQ gives staff the data to act immediately.
              </p>
              
              <div className={styles.pointsList}>
                <div className={styles.pointItem}>
                  <div className={styles.pointIcon}><Map size={18} /></div>
                  <div>
                    <h4 className={styles.pointTitle}>Zone Dispatch</h4>
                    <p className={styles.pointDesc}>Assign staff automatically based on anomaly density.</p>
                  </div>
                </div>
                <div className={styles.pointItem}>
                  <div className={styles.pointIcon}><Timer size={18} /></div>
                  <div>
                    <h4 className={styles.pointTitle}>Predictive Modeling</h4>
                    <p className={styles.pointDesc}>See where crowds will be in 15 minutes, not where they were.</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            {/* Video-like Animation Frame */}
            <div className={styles.twinVisualContainer}>
              <motion.div 
                style={{ width: "80%", height: "80%", background: "white", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 600, color: "#202124" }}>System Status</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ea4335" }}></span>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#fbbc04" }}></span>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#34a853" }}></span>
                  </div>
                </div>
                
                {/* Simulated animated bar charts */}
                {[0.8, 0.4, 0.9, 0.3, 0.6].map((width, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "40px", fontSize: "0.8rem", color: "#5f6368" }}>Sec {i+1}</div>
                    <div style={{ flex: 1, height: "12px", background: "#f1f3f4", borderRadius: "6px", overflow: "hidden" }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${width * 100}%` }}
                        transition={{ duration: 1.5, delay: i * 0.1, type: "spring" }}
                        style={{ height: "100%", background: width > 0.8 ? "#ea4335" : (width > 0.5 ? "#fbbc04" : "#34a853"), borderRadius: "6px" }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== CTA Footer ===== */}
      <footer className={styles.ctaFooter}>
        <div className={styles.ctaBox}>
          <FadeIn>
            <h2 className={styles.ctaTitle}>Ready to transform your venue?</h2>
            <p className={styles.ctaDesc}>Step into the future of physical spaces with our next-generation platform.</p>
            <div className={styles.ctaFinalButtons}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/auth" className={styles.btnWhite}>Go to Dashboard</Link>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </footer>
    </div>
  );
}
