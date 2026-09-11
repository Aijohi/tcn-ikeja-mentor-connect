import { useState } from "react";
import { Eye, EyeOff, HeartHandshake } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleSubmitting(true);

    const { error: googleError } = await signInWithGoogle();

    if (googleError) {
      console.error("Unable to sign in with Google:", googleError);
      setError(
        googleError.message ||
          "Google sign-in could not be started. Please try again.",
      );
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const { data, error: loginError } = await signIn(
      form.email.trim(),
      form.password,
    );

    if (loginError || !data?.user) {
      setSubmitting(false);
      setError("The email address or password you entered is incorrect.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status, onboarding_completed")
      .eq("id", data.user.id)
      .single();

    setSubmitting(false);

    if (profileError || !profile) {
      setError("We could not load your profile.");
      return;
    }

    if (profile.account_status === "suspended") {
      navigate("/account-suspended");
      return;
    }

    if (!profile.onboarding_completed) {
      navigate("/complete-profile");
      return;
    }

    if (
      profile.role === "admin" ||
      profile.role === "super_admin" ||
      profile.role === "safeguarding_lead"
    ) {
      setError(
        "This is the mentor and mentee sign-in page. Please use the administrator portal.",
      );
      return;
    }

    if (
      profile.account_status === "pending" ||
      profile.account_status === "rejected"
    ) {
      navigate("/membership-pending");
      return;
    }

    if (profile.role === "mentor") {
      if (profile.account_status === "active") {
        navigate("/mentor/dashboard");
      } else {
        navigate("/mentor/application-status");
      }

      return;
    }

    if (profile.role === "mentee") {
      navigate("/mentee/dashboard");
      return;
    }

    setError("Your account does not have a recognised role.");
  }

  const authenticationInProgress = submitting || googleSubmitting;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Link
            to="/"
            className="brand"
            aria-label="Return to Mentor Connect homepage"
          >
            <span className="brand-icon">
              <HeartHandshake size={22} />
            </span>

            <span className="brand-text">
              <strong>Mentor Connect</strong>
              <small>TCN IKEJA</small>
            </span>
          </Link>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">WELCOME BACK</span>
          <h1>Continue your mentoring journey.</h1>
          <p>Sign in using the email connected to your account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              autoComplete="email"
              disabled={authenticationInProgress}
              required
            />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={updateForm}
                autoComplete="current-password"
                disabled={authenticationInProgress}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={authenticationInProgress}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="form-options">
            <span />

            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button full-button"
            disabled={authenticationInProgress}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogleSignIn}
          disabled={authenticationInProgress}
        >
          <GoogleIcon />

          {googleSubmitting
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>

        <p className="account-copy">
          New to Mentor Connect? <Link to="/register">Create an account</Link>
        </p>
      </section>

      <section className="auth-message">
        <span className="eyebrow">GROW WITH GUIDANCE</span>
        <h2>Purposeful conversations. Meaningful growth.</h2>
      </section>
    </main>
  );
}

export default Login;
