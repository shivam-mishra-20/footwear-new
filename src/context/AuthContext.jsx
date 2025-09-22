/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

const AuthContext = createContext({ user: null, loading: true, role: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setRole(null);
      if (u) {
        try {
          const ref = doc(db, "Users", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setRole(snap.data().role || null);
          }
        } catch (err) {
          console.warn("Failed to fetch user role", err);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

export function useAuth() {
  return useContext(AuthContext);
}
