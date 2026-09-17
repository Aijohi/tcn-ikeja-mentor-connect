import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

const AuthContext =
  createContext(null);

const GOOGLE_ACCOUNT_INTENT_KEY =
  "mentorConnectGoogleAccountIntent";

const PRODUCTION_APP_URL =
  "https://mentorship.tcnikeja.org";

function getAppBaseUrl() {
  if (
    import.meta.env.DEV
  ) {
    return window.location.origin;
  }

  const configuredUrl =
    String(
      import.meta.env
        .VITE_APP_URL ||
        "",
    )
      .trim()
      .replace(/\/+$/, "");

  return (
    configuredUrl ||
    PRODUCTION_APP_URL
  );
}

export function AuthProvider({
  children,
}) {
  const [
    session,
    setSession,
  ] = useState(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  async function loadProfile(
    userId,
  ) {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        userId,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Unable to load user profile:",
        error.message,
      );

      setProfile(null);
      return null;
    }

    setProfile(
      data ?? null,
    );

    return data ?? null;
  }

  useEffect(() => {
    let isMounted = true;

    async function initialiseAuthentication() {
      const {
        data: {
          session:
            currentSession,
        },
        error,
      } =
        await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load authentication session:",
          error.message,
        );
      }

      setSession(
        currentSession ??
          null,
      );

      if (
        currentSession?.user
      ) {
        await loadProfile(
          currentSession.user.id,
        );
      } else {
        setProfile(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    initialiseAuthentication();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          currentSession,
        ) => {
          setSession(
            currentSession ??
              null,
          );

          if (
            !currentSession
              ?.user
          ) {
            setProfile(
              null,
            );

            setLoading(
              false,
            );

            return;
          }

          window.setTimeout(
            async () => {
              await loadProfile(
                currentSession
                  .user.id,
              );

              if (
                isMounted
              ) {
                setLoading(
                  false,
                );
              }
            },
            0,
          );
        },
      );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp({
    fullName,
    email,
    phoneNumber,
    password,
    role,
  }) {
    const accountIntent =
      role === "mentor"
        ? "mentor"
        : "mentee";

    return supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: {
            full_name:
              fullName,
            phone_number:
              phoneNumber,
            role:
              "mentee",
            signup_intent:
              accountIntent,
          },
          emailRedirectTo:
            `${getAppBaseUrl()}/verify-email`,
        },
      },
    );
  }

  async function signInWithGoogle(
    accountIntent = null,
  ) {
    const allowedIntents = [
      "mentee",
      "mentor",
    ];

    if (
      allowedIntents.includes(
        accountIntent,
      )
    ) {
      sessionStorage.setItem(
        GOOGLE_ACCOUNT_INTENT_KEY,
        accountIntent,
      );
    } else {
      sessionStorage.removeItem(
        GOOGLE_ACCOUNT_INTENT_KEY,
      );
    }

    const result =
      await supabase.auth.signInWithOAuth(
        {
          provider:
            "google",
          options: {
            redirectTo:
              `${getAppBaseUrl()}/auth/callback`,
            queryParams: {
              prompt:
                "select_account",
            },
          },
        },
      );

    if (result.error) {
      sessionStorage.removeItem(
        GOOGLE_ACCOUNT_INTENT_KEY,
      );
    }

    return result;
  }

  function getGoogleAccountIntent() {
    const accountIntent =
      sessionStorage.getItem(
        GOOGLE_ACCOUNT_INTENT_KEY,
      );

    return [
      "mentee",
      "mentor",
    ].includes(
      accountIntent,
    )
      ? accountIntent
      : null;
  }

  function clearGoogleAccountIntent() {
    sessionStorage.removeItem(
      GOOGLE_ACCOUNT_INTENT_KEY,
    );
  }

  async function signIn(
    email,
    password,
  ) {
    const result =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

    if (
      result.data.user
    ) {
      await loadProfile(
        result.data.user.id,
      );
    }

    return result;
  }

  async function signOut() {
    const result =
      await supabase.auth.signOut(
        {
          scope: "local",
        },
      );

    setSession(null);
    setProfile(null);

    sessionStorage.removeItem(
      GOOGLE_ACCOUNT_INTENT_KEY,
    );

    return result;
  }

  async function resetPassword(
    email,
  ) {
    return supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${getAppBaseUrl()}/reset-password`,
      },
    );
  }

  async function updatePassword(
    password,
  ) {
    return supabase.auth.updateUser(
      {
        password,
      },
    );
  }

  async function refreshProfile() {
    if (
      !session?.user
    ) {
      setProfile(null);
      return null;
    }

    return loadProfile(
      session.user.id,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user:
          session?.user ??
          null,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        getGoogleAccountIntent,
        clearGoogleAccountIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}
