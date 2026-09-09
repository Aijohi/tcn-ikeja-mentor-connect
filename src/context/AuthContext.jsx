import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Unable to load user profile:", error.message);
      setProfile(null);
      return null;
    }

    setProfile(data);
    return data;
  }

  useEffect(() => {
    async function initialiseAuthentication() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      }

      setLoading(false);
    }

    initialiseAuthentication();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp({
    fullName,
    email,
    phoneNumber,
    password,
    role,
  }) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          role,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
  }

  async function signIn(email, password) {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.data.user) {
      await loadProfile(result.data.user.id);
    }

    return result;
  }

  async function signOut() {
    const result = await supabase.auth.signOut();

    setSession(null);
    setProfile(null);

    return result;
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  async function updatePassword(password) {
    return supabase.auth.updateUser({
      password,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile: () =>
          session?.user ? loadProfile(session.user.id) : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}