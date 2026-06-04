import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

function isInviteOrRecoveryUrl() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get("type");
  return type === "invite" || type === "recovery";
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Read the hash immediately — Supabase clears it before onAuthStateChange fires
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(isInviteOrRecoveryUrl);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && !needsPasswordSetup) loadProfile(session.user.id);
      else if (!needsPasswordSetup) setAuthLoading(false);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setNeedsPasswordSetup(true);
        setAuthLoading(false);
        return;
      }
      setSession(session);
      if (session && !needsPasswordSetup) loadProfile(session.user.id);
      else if (!session) {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data);
    } catch (err) {
      console.error("Profile load failed:", err);
    } finally {
      setAuthLoading(false);
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function setPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setNeedsPasswordSetup(false);
    window.location.hash = "";
  }

  return {
    session,
    profile,
    authLoading,
    needsPasswordSetup,
    isAdmin: profile?.role === "admin",
    signIn,
    signOut,
    setPassword,
  };
}
