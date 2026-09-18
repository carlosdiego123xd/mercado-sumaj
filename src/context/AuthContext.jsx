import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState(null); // { reason, date }
  const [authError, setAuthError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) return null;
    return data;
  }, []);

  const handleSession = useCallback(async (newSession) => {
    if (!newSession) { setSession(null); setProfile(null); return; }
    const prof = await loadProfile(newSession.user.id);
    if (prof && prof.blocked) {
      setBlockedNotice({ reason: prof.blocked_reason || "No se especificó un motivo.", date: prof.blocked_at ? new Date(prof.blocked_at).toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" }) : "fecha no registrada" });
      await supabase.auth.signOut();
      setSession(null); setProfile(null);
      return;
    }
    setSession(newSession);
    setProfile(prof);
  }, [loadProfile]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      await handleSession(data.session);
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") { setRecoveryMode(true); return; }
      handleSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, [handleSession]);

  async function login({ email, password }) {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError("Correo o contraseña incorrectos."); return false; }
    return true;
  }

  async function register({ fullName, email, password }) {
    setAuthError("");
    if (password.length < 6) { setAuthError("La contraseña debe tener al menos 6 caracteres."); return false; }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) { setAuthError(error.message.includes("registered") ? "Ya existe una cuenta con ese correo." : error.message); return false; }
    return true;
  }

  async function forgotPassword(email) {
    setAuthError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) { setAuthError(error.message); return false; }
    return true;
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  async function refreshProfile() {
    if (!session) return;
    const prof = await loadProfile(session.user.id);
    setProfile(prof);
  }

  async function completePasswordReset(newPassword) {
    setAuthError("");
    if (newPassword.length < 6) { setAuthError("La nueva contraseña debe tener al menos 6 caracteres."); return false; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setAuthError(error.message); return false; }
    setRecoveryMode(false);
    await supabase.auth.signOut();
    return true;
  }

  const value = {
    session, profile, ready, blockedNotice, setBlockedNotice, authError, setAuthError, recoveryMode,
    login, register, forgotPassword, logout, refreshProfile, completePasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
