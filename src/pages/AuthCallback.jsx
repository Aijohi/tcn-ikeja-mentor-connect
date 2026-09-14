import {
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./AuthCallback.css";

const administratorRoles = [
  "admin",
  "safeguarding_lead",
];

function AuthCallback() {
  const navigate = useNavigate();

  const {
    user,
    profile,
    loading,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  } = useAuth();

  const [
    error,
    setError,
  ] = useState("");

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

      const accountIntent =
        getGoogleAccountIntent();

      if (accountIntent) {
        const {
          error: intentError,
        } = await supabase.rpc(
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
      }

      if (
        profile.account_status ===
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
        administratorRoles.includes(
          profile.role,
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

      if (
        !profile.onboarding_completed
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
        profile.account_status ===
          "pending" ||
        profile.account_status ===
          "rejected"
      ) {
        navigate(
          "/membership-pending",
          {
            replace: true,
          },
        );

        return;
      }

      /*
        Ordinary public registration
        can still record "mentor" as
        the signup intent.

        That user remains a mentee
        account and must submit a
        mentor application before
        separate mentor access is
        created.
      */
      if (
        accountIntent === "mentor"
      ) {
        navigate(
          "/mentor/apply",
          {
            replace: true,
          },
        );

        return;
      }

      if (
        profile.role === "mentor"
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
      <main className="auth-callback-page">
        <section className="auth-callback-card">
          <Link
            to="/"
            className="auth-callback-brand"
            aria-label="Return to Mentor Connect homepage"
          >
            <img
              src="/images/hothub-logo.png"
              alt="HOTHUB"
            />

            <span>
              <strong>
                Mentor Connect
              </strong>

              <small>
                TCN IKEJA
              </small>
            </span>
          </Link>

          <div className="auth-callback-icon auth-callback-icon--error">
            <AlertCircle
              size={28}
              strokeWidth={1.8}
            />
          </div>

          <span className="auth-callback-eyebrow">
            SIGN-IN ISSUE
          </span>

          <h1>
            Google sign-in was not
            completed
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="auth-callback-primary-button"
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
        </section>
      </main>
    );
  }

  return (
    <main className="auth-callback-page">
      <section className="auth-callback-card">
        <Link
          to="/"
          className="auth-callback-brand"
          aria-label="Return to Mentor Connect homepage"
        >
          <img
            src="/images/hothub-logo.png"
            alt="HOTHUB"
          />

          <span>
            <strong>
              Mentor Connect
            </strong>

            <small>
              TCN IKEJA
            </small>
          </span>
        </Link>

        <div className="auth-callback-icon">
          <LoaderCircle
            size={28}
            strokeWidth={1.8}
            className="auth-callback-spinner"
          />
        </div>

        <span className="auth-callback-eyebrow">
          PREPARING YOUR ACCOUNT
        </span>

        <h1>
          Completing your sign-in
        </h1>

        <p>
          Please wait while we prepare
          your Mentor Connect account.
        </p>
      </section>
    </main>
  );
}

export default AuthCallback;
