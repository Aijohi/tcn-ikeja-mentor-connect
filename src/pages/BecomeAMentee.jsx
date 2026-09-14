import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./BecomeAMentee.css";

function BecomeAMentee() {
  const navigate = useNavigate();

  const {
    user,
    profile,
    signOut,
  } = useAuth();

  const [
    leavingPlatform,
    setLeavingPlatform,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const mentorEmail =
    profile?.email ||
    user?.email ||
    "";

  async function leaveFor(
    destination,
    action,
  ) {
    if (leavingPlatform) {
      return;
    }

    setError("");
    setLeavingPlatform(action);

    const {
      error: signOutError,
    } = await signOut({
      redirectTo:
        destination,
    });

    if (signOutError) {
      console.error(
        "Unable to leave mentor platform:",
        signOutError,
      );

      setError(
        "We could not sign you out of your mentor account. Please try again.",
      );

      setLeavingPlatform("");
    }
  }

  async function handleCreateMenteeAccount() {
    await leaveFor(
      "/register?account=mentee&from=mentor",
      "create",
    );
  }

  async function handleMenteeSignIn() {
    await leaveFor(
      "/login?account=mentee&from=mentor",
      "signin",
    );
  }

  return (
    <main className="become-mentee-page">
      <section className="become-mentee-card">
        <Link
          to="/mentor/dashboard"
          className="become-mentee-brand"
          aria-label="Return to mentor dashboard"
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

        <div className="become-mentee-content">
          <span className="become-mentee-eyebrow">
            MENTEE ACCESS
          </span>

          <h1>
            Looking for guidance too?
          </h1>

          <p className="become-mentee-description">
            Your mentor and mentee
            accounts are kept separate.
            Create a new mentee account,
            or sign in if you already
            have one.
          </p>

          <div className="become-mentee-notice">
            <strong>
              Separate email required
            </strong>

            <p>
              Your mentee account must
              use a different email
              address from your mentor
              account.
            </p>

            {mentorEmail && (
              <span>
                Current mentor email:{" "}
                <strong>
                  {mentorEmail}
                </strong>
              </span>
            )}
          </div>

          {error && (
            <p
              className="become-mentee-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="become-mentee-actions">
            <button
              type="button"
              className="become-mentee-primary"
              onClick={
                handleCreateMenteeAccount
              }
              disabled={
                Boolean(
                  leavingPlatform,
                )
              }
            >
              {leavingPlatform ===
              "create"
                ? "Preparing registration..."
                : "Create mentee account"}
            </button>

            <button
              type="button"
              className="become-mentee-secondary"
              onClick={
                handleMenteeSignIn
              }
              disabled={
                Boolean(
                  leavingPlatform,
                )
              }
            >
              {leavingPlatform ===
              "signin"
                ? "Opening sign in..."
                : "Sign in to mentee account"}
            </button>

            <button
              type="button"
              className="become-mentee-tertiary"
              onClick={() =>
                navigate(
                  "/mentor/dashboard",
                )
              }
              disabled={
                Boolean(
                  leavingPlatform,
                )
              }
            >
              Stay on mentor platform
            </button>
          </div>

          <p className="become-mentee-footnote">
            Creating or signing in to a
            mentee account will sign you
            out of this mentor account
            first.
          </p>
        </div>
      </section>
    </main>
  );
}

export default BecomeAMentee;
