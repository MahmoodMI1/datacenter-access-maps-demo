import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        const hash = window.location.hash;
        if (hash.includes("type=invite") || hash.includes("type=recovery")) {
          setNeedsPasswordSetup(true);
          setAuthLoading(false);
          return;
        }
      }
      if (session) loadProfile(session.user.id);
      else {
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
