import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const navigate = useNavigate();

  const {
    user,
    profile,
    loading,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  } = useAuth();

  const [error, setError] = useState("");

  useEffect(() => {
    async function completeGoogleAuthentication() {
      if (loading) {
        return;
      }

      if (!user) {
        setError(
          "Google sign-in could not be completed. Please return to the sign-in page and try again.",
        );
        return;
      }

      if (!profile) {
        setError(
          "Your account was created, but we could not load your profile. Please try signing in again.",
        );
        return;
      }

      const accountIntent = getGoogleAccountIntent();

      if (accountIntent) {
        const { error: intentError } = await supabase.rpc("set_signup_intent", {
          p_signup_intent: accountIntent,
        });

        if (intentError) {
          console.error("Unable to save signup intent:", intentError);
          setError(
            "Your Google account was connected, but we could not save your selected account type. Please try again.",
          );
          return;
        }
      }

      if (profile.account_status === "suspended") {
        clearGoogleAccountIntent();
        navigate("/account-suspended", { replace: true });
        return;
      }

      if (
        profile.role === "admin" ||
        profile.role === "super_admin" ||
        profile.role === "safeguarding_lead"
      ) {
        clearGoogleAccountIntent();
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (!profile.onboarding_completed) {
        navigate("/complete-profile", { replace: true });
        return;
      }

      clearGoogleAccountIntent();

      if (
        profile.account_status === "pending" ||
        profile.account_status === "rejected"
      ) {
        navigate("/membership-pending", { replace: true });
        return;
      }

      if (accountIntent === "mentor") {
        navigate("/mentee/become-a-mentor", { replace: true });
        return;
      }

      if (profile.role === "mentor") {
        navigate("/mentor/dashboard", { replace: true });
        return;
      }

      navigate("/mentee/dashboard", { replace: true });
    }

    completeGoogleAuthentication();
  }, [
    loading,
    user,
    profile,
    navigate,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  ]);

  if (error) {
    return (
      <main className="page-message">
        <h1>Google sign-in was not completed</h1>
        <p>{error}</p>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/login", { replace: true })}
        >
          Return to sign in
        </button>
      </main>
    );
  }

  return (
    <main className="page-message">
      <div className="loader" />
      <h1>Completing your sign-in</h1>
      <p>Please wait while we prepare your account.</p>
    </main>
  );
}

export default AuthCallback;
