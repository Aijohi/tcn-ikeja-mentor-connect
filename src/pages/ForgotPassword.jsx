import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ForgotPassword() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: resetError } =
      await resetPassword(normalizedEmail);

    setSubmitting(false);

    if (resetError) {
      console.error(
        "Unable to send password reset email:",
        resetError.message,
      );

      setError(
        resetError.message ||
          "We could not send the password reset email. Please try again.",
      );

      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="page-message">
        <span className="status-icon">
          <CheckCircle2 size={30} />
        </span>

        <h1>Check your email</h1>

        <p>
          If an account exists for {email.trim()}, we have sent
          password reset instructions to that email address.
        </p>

        <p>
          Open the email and use the reset link to choose a new
          password.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
            marginTop: "24px",
          }}
        >
          <Link
            to="/login"
            className="secondary-button"
          >
            Member sign in
          </Link>

          <Link
            to="/admin/login"
            className="secondary-button"
          >
            Administrator sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link
          to="/login"
          className="back-link"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="auth-heading">
          <span className="eyebrow">
            PASSWORD RECOVERY
          </span>

          <h1>Reset your password</h1>

          <p>
            Enter the email address connected to your Mentor
            Connect account. We will send you a secure reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <label>
            Email address

            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={submitting}
              required
            />
          </label>

          <button
            type="submit"
            disabled={
              submitting ||
              !email.trim()
            }
          >
            <Mail size={17} />

            {submitting
              ? "Sending reset link..."
              : "Send reset link"}
          </button>
        </form>

        <p className="account-copy">
          Remembered your password?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>
      </section>

      <aside className="auth-message">
        <Mail size={34} />

        <span className="eyebrow">
          SECURE ACCOUNT ACCESS
        </span>

        <h2>
          Get back into your account safely.
        </h2>

        <p>
          Password reset links are sent only to the email address
          connected to your Mentor Connect account.
        </p>
      </aside>
    </main>
  );
}

export default ForgotPassword;
