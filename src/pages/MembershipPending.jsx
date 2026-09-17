import {
  Clock3,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  supabase,
} from "../lib/supabase";

function MembershipPending() {
  const {
    profile,
    signOut,
  } = useAuth();

  const [
    application,
    setApplication,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const isMentorSignup =
    profile?.signup_intent ===
      "mentor" ||
    profile?.role ===
      "mentor";

  useEffect(() => {
    let mounted = true;

    async function loadApplication() {
      if (!profile?.id || !isMentorSignup) {
        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          "mentor_applications",
        )
        .select(
          `
            id,
            status,
            admin_feedback,
            operations_feedback,
            onboarding_recommendation,
            operations_decision,
            created_at,
            updated_at
          `,
        )
        .eq(
          "applicant_user_id",
          profile.id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load mentor application status:",
          error,
        );
      }

      setApplication(
        data ?? null,
      );
      setLoading(false);
    }

    loadApplication();

    return () => {
      mounted = false;
    };
  }, [
    isMentorSignup,
    profile?.id,
  ]);

  if (!isMentorSignup) {
    return (
      <Navigate
        to="/mentee/dashboard"
        replace
      />
    );
  }

  async function handleSignOut() {
    await signOut();

    window.location.replace(
      "/",
    );
  }

  const applicationStatus =
    application?.status ||
    (profile?.account_status ===
    "rejected"
      ? "rejected"
      : "pending");

  const isRejected =
    applicationStatus ===
    "rejected";

  const isApproved =
    applicationStatus ===
    "approved" ||
    profile?.role ===
      "mentor";

  if (isApproved) {
    return (
      <Navigate
        to="/mentor/dashboard"
        replace
      />
    );
  }

  const feedback =
    application?.operations_feedback ||
    application?.admin_feedback ||
    "";

  return (
    <main className="page-message">
      <span className="status-icon">
        {isRejected ? (
          <ShieldCheck
            size={38}
          />
        ) : (
          <Clock3
            size={38}
          />
        )}
      </span>

      <span className="eyebrow">
        {isRejected
          ? "MENTOR APPLICATION REVIEWED"
          : "MENTOR APPLICATION UNDER REVIEW"}
      </span>

      <h1>
        {isRejected
          ? "Your mentor application was not approved"
          : `Thank you${
              profile?.full_name
                ? `, ${profile.full_name}`
                : ""
            }`}
      </h1>

      <p>
        {isRejected
          ? "The TCN Ikeja administration team has completed its review of your mentor application."
          : "Your membership information and mentor application have been submitted together. You do not need to complete another verification form."}
      </p>

      <div className="restricted-notice">
        <ShieldCheck
          size={18}
        />

        <span>
          {isRejected
            ? feedback ||
              "Please contact the TCN Ikeja administration team if you need more information about the decision."
            : loading
              ? "Checking the latest application status..."
              : "You will receive access to the mentor dashboard after the application receives final approval."}
        </span>
      </div>

      <button
        type="button"
        className="membership-sign-out-button"
        onClick={
          handleSignOut
        }
      >
        <LogOut
          size={17}
        />
        Sign out
      </button>
    </main>
  );
}

export default MembershipPending;
