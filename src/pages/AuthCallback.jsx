import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  supabase,
} from "../lib/supabase";

function AuthCallback() {
  const navigate =
    useNavigate();

  const {
    user,
    profile,
    loading,
    refreshProfile,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  } = useAuth();

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function completeGoogleAuthentication() {
      if (loading) {
        return;
      }

      if (!user) {
        setError(
          "Google sign in could not be completed. Please return to the sign in page and try again.",
        );
        return;
      }

      if (!profile) {
        setError(
          "Your account was created, but we could not load your profile. Please try signing in again.",
        );
        return;
      }

      const accountIntent =
        getGoogleAccountIntent();

      let currentProfile =
        profile;

      if (
        accountIntent
      ) {
        const {
          error:
            intentError,
        } =
          await supabase.rpc(
            "set_signup_intent",
            {
              p_signup_intent:
                accountIntent,
            },
          );

        if (intentError) {
          console.error(
            "Unable to save signup intent:",
            intentError,
          );

          setError(
            "Your Google account was connected, but we could not save your selected account type. Please try again.",
          );

          return;
        }

        const refreshedProfile =
          await refreshProfile();

        if (
          refreshedProfile
        ) {
          currentProfile =
            refreshedProfile;
        }
      }

      if (cancelled) {
        return;
      }

      if (
        currentProfile
          .account_status ===
        "suspended"
      ) {
        clearGoogleAccountIntent();

        navigate(
          "/account-suspended",
          {
            replace: true,
          },
        );

        return;
      }

      if (
        [
          "admin",
          "super_admin",
          "safeguarding_lead",
        ].includes(
          currentProfile.role,
        )
      ) {
        clearGoogleAccountIntent();

        navigate(
          "/admin/dashboard",
          {
            replace: true,
          },
        );

        return;
      }

      const isMentorSignup =
        currentProfile
          .signup_intent ===
          "mentor" ||
        accountIntent ===
          "mentor";

      if (
        isMentorSignup &&
        !currentProfile
          .onboarding_completed
      ) {
        navigate(
          "/complete-profile",
          {
            replace: true,
          },
        );

        return;
      }

      clearGoogleAccountIntent();

      if (
        isMentorSignup &&
        (
          currentProfile
            .account_status ===
            "pending" ||
          currentProfile
            .account_status ===
            "rejected"
        )
      ) {
        navigate(
          "/membership-pending",
          {
            replace: true,
          },
        );

        return;
      }

      if (
        currentProfile.role ===
        "mentor"
      ) {
        navigate(
          "/mentor/dashboard",
          {
            replace: true,
          },
        );

        return;
      }

      navigate(
        "/mentee/dashboard",
        {
          replace: true,
        },
      );
    }

    completeGoogleAuthentication();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    user,
    profile,
    navigate,
    refreshProfile,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  ]);

  if (error) {
    return (
      <main className="page-message">
        <h1>
          Google sign in was not completed
        </h1>

        <p>
          {error}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate(
              "/login",
              {
                replace: true,
              },
            )
          }
        >
          Return to sign in
        </button>
      </main>
    );
  }

  return (
    <main className="page-message">
      <div className="loader" />

      <h1>
        Completing your sign in
      </h1>

      <p>
        Please wait while we prepare your account.
      </p>
    </main>
  );
}

export default AuthCallback;
