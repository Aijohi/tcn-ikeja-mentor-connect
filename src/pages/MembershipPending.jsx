import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./MembershipPending.css";

function MembershipPending() {
  const {
    profile,
    signOut,
  } = useAuth();

  async function handleSignOut() {
    await signOut({
      redirectTo: "/",
    });
  }

  const isRejected =
    profile?.account_status ===
    "rejected";

  const firstName =
    profile?.full_name
      ?.trim()
      ?.split(/\s+/)
      ?.[0] || "";

  return (
    <main className="membership-pending-page">
      <section className="membership-pending-card">
        <Link
          to="/"
          className="membership-pending-brand"
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

        <div className="membership-pending-content">
          <span
            className={`membership-pending-eyebrow ${
              isRejected
                ? "membership-pending-eyebrow--rejected"
                : ""
            }`}
          >
            {isRejected
              ? "MEMBERSHIP REVIEWED"
              : "MEMBERSHIP UNDER REVIEW"}
          </span>

          <h1>
            {isRejected
              ? "We could not verify your membership"
              : firstName
                ? `Thank you, ${firstName}`
                : "Thank you"}
          </h1>

          <p className="membership-pending-description">
            {isRejected
              ? "Please contact the TCN Ikeja administration team if you believe this decision was made in error."
              : "Your membership information has been submitted to the TCN Ikeja administration team for verification."}
          </p>

          <div
            className={`membership-pending-notice ${
              isRejected
                ? "membership-pending-notice--rejected"
                : ""
            }`}
          >
            <p>
              {isRejected
                ? "Your account will remain restricted until an administrator reviews it again."
                : "You will receive access to the member dashboard after your membership is verified."}
            </p>
          </div>

          <button
            type="button"
            className="membership-sign-out-button"
            onClick={
              handleSignOut
            }
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

export default MembershipPending;
