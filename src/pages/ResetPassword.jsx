import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const administratorRoles = [
  "admin",
  "safeguarding_lead",
];

function ResetPassword() {
  const {
    profile,
    updatePassword,
    signOut,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const signInPath = useMemo(() => {
    if (
      profile &&
      administratorRoles.includes(profile.role)
    ) {
      return "/admin/login";
    }

    if (profile?.role === "mentor") {
      return "/mentor/login";
    }

    return "/login";
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    if (password.length < 8) {
      setError(
        "Your new password must be at least 8 characters long.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match.",
      );
      return;
    }

    setSubmitting(true);

    const { error: updateError } =
      await updatePassword(password);

    setSubmitting(false);

    if (updateError) {
      console.error(
        "Unable to update password:",
        updateError.message,
      );

      setError(
        updateError.message ||
          "We could not update your password. Please request a new reset link and try again.",
      );
      return;
    }

    setSuccess(true);
  }

  async function continueToSignIn() {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    const result =
      await signOut({
        redirectTo: signInPath,
      });

    if (result?.error) {
      setSubmitting(false);

      setError(
        "Your password was changed, but we could not finish signing you out. Please refresh the page and sign in again.",
      );
    }
  }

  if (success) {
    return (
      <main className="page-message">
        <span className="status-icon">
          <CheckCircle2 size={30} />
        </span>

        <h1>Password updated</h1>

        <p>
          Your new password has been saved successfully.
        </p>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={continueToSignIn}
          disabled={submitting}
        >
          {submitting
            ? "Preparing sign in..."
            : "Continue to sign in"}
        </button>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <span className="eyebrow">
            CREATE NEW PASSWORD
          </span>

          <h1>Choose a new password</h1>

          <p>
            Enter a new password for your Mentor Connect account.
            Use at least 8 characters.
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
            New password

            <div className="password-field">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter a new password"
                autoComplete="new-password"
                minLength={8}
                disabled={submitting}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={submitting}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <label>
            Confirm new password

            <div className="password-field">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value,
                  );
                  setError("");
                }}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                minLength={8}
                disabled={submitting}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current,
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={submitting}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={
              submitting ||
              !password ||
              !confirmPassword
            }
          >
            <LockKeyhole size={17} />

            {submitting
              ? "Updating password..."
              : "Update password"}
          </button>
        </form>
      </section>

      <aside className="auth-message">
        <LockKeyhole size={34} />

        <span className="eyebrow">
          ACCOUNT SECURITY
        </span>

        <h2>
          Set a password you will remember.
        </h2>

        <p>
          After your password is updated, you will return to the
          correct sign-in page for your account.
        </p>
      </aside>
    </main>
  );
}

export default ResetPassword;
