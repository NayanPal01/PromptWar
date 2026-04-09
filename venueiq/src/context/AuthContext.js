"use client";

/**
 * AuthContext — Global authentication state for VenueIQ
 * 
 * Provides: user, loading, role, login, signup, googleLogin, logout
 * Wraps the entire app so any component can access auth state.
 */

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "fan" | "staff"
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save user profile to Firestore
  const saveUserToFirestore = async (firebaseUser, userRole, displayName) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const existing = await getDoc(userRef);
    
    if (!existing.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.displayName || "User",
        role: userRole,
        photoURL: firebaseUser.photoURL || null,
        createdAt: serverTimestamp(),
      });
    }
    setRole(userRole);
  };

  // Email + Password Sign Up
  const signup = async (email, password, name, userRole = "fan") => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await saveUserToFirestore(result.user, userRole, name);
    return result.user;
  };

  // Email + Password Login
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Google Sign-In
  const googleLogin = async (userRole = "fan") => {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user, userRole);
    return result.user;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signup, login, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
