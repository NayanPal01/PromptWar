"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Map, ArrowLeft, Mail, Lock, User, Chrome } from "lucide-react";
import styles from "./auth.module.css";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "fan";

  const { signup, login, googleLogin } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, name, role);
      } else {
        await login(email, password);
      }
      router.push(role === "host" ? "/host" : role === "staff" ? "/staff" : "/events");
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Email already in use. Try logging in."
          : err.code === "auth/wrong-password" || err.code === "auth/user-not-found"
          ? "Invalid email or password."
          : err.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(role);
      router.push(role === "host" ? "/host" : role === "staff" ? "/staff" : "/events");
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={18} />
            Back to home
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={styles.leftTitle}>
              {role === "host"
                ? "Create & manage venues."
                : role === "staff"
                ? "Command your venue."
                : "Navigate like a pro."}
            </h2>
            <p className={styles.leftDesc}>
              {role === "host"
                ? "Set up events, configure venues with templates, monitor real-time crowd data, and coordinate your team."
                : role === "staff"
                ? "Real-time crowd monitoring, incident dispatch, and operational intelligence — all in one dashboard."
                : "Skip queues, find the best food stalls, get live crowd updates, and stay safe at every event."}
            </p>
          </motion.div>

          {/* Animated SVG art */}
          <motion.svg
            width="260"
            height="200"
            viewBox="0 0 260 200"
            fill="none"
            className={styles.leftArt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.ellipse
              cx="130" cy="100" rx="110" ry="70"
              stroke={role === "host" ? "#f9ab00" : role === "staff" ? "#34a853" : "#4285f4"}
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
            <motion.ellipse
              cx="130" cy="100" rx="70" ry="40"
              stroke={role === "host" ? "#f9ab00" : role === "staff" ? "#34a853" : "#4285f4"}
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
            />
            <motion.circle
              cx="130" cy="100" r="5"
              fill={role === "host" ? "#f9ab00" : role === "staff" ? "#34a853" : "#4285f4"}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              r="4"
              fill={role === "host" ? "#f9ab00" : role === "staff" ? "#34a853" : "#4285f4"}
              opacity="0.7"
              animate={{ cx: [60, 200, 130, 60], cy: [80, 120, 60, 80] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </motion.svg>
        </div>
      </div>

      {/* Right auth form */}
      <div className={styles.rightPanel}>
        <motion.div
          className={styles.formCard}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", bounce: 0.2 }}
        >
          {/* Logo */}
          <div className={styles.formLogo}>
            <div className={styles.formLogoIcon}><Map size={20} /></div>
            <span className={styles.formLogoText}>Venue<span className={styles.accent}>IQ</span></span>
          </div>

          <h1 className={styles.formTitle}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className={styles.formSubtitle}>
            {mode === "login"
              ? "Sign in to continue to your dashboard"
              : "Join VenueIQ to get started"}
          </p>

          {/* Role Toggle */}
          <div className={styles.roleToggle}>
            <button
              className={`${styles.roleBtn} ${role === "fan" ? styles.roleBtnActive : ""}`}
              onClick={() => setRole("fan")}
              type="button"
            >
              🎟️ Attendee
            </button>
            <button
              className={`${styles.roleBtn} ${role === "host" ? styles.roleBtnActive : ""}`}
              onClick={() => setRole("host")}
              type="button"
            >
              🎯 Host
            </button>

          </div>

          {/* Google Sign-In */}
          <button
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={loading}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/>
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.inputGroup}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.input}
                      required
                      id="auth-name"
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.inputGroup}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
                id="auth-email"
                autoComplete="email"
              />
            </div>

            <div className={styles.inputGroup}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                minLength={6}
                id="auth-password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <motion.div
                className={styles.error}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <p className={styles.switchMode}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className={styles.switchBtn}
              type="button"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
