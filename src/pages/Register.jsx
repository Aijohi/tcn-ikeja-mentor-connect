import { useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  role: "",
  acceptedTerms: false,
};

function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  }

  async function handleGoogleSignIn() {
    setError("");

    if (!form.role) {
      setError("Please select how you would like to use Mentor Connect.");
      return;
    }

    setGoogleSubmitting(true);

    const { error: googleError } = await signInWithGoogle(form.role);

    if (googleError) {
      console.error("Unable to continue with Google:", googleError);
      setError(
        googleError.message ||
          "Google registration could not be started. Please try again.",
      );
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.role) {
      setError("Please select how you would like to use Mentor Connect.");
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!form.acceptedTerms) {
      setError(
        "You must accept the terms, privacy notice, code of conduct and safety guidelines.",
      );
      return;
    }

    setSubmitting(true);

    const { error: signUpError } = await signUp({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      password: form.password,
      role: form.role,
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate("/check-email", {
      state: {
        email: form.email.trim(),
      },
    });
  }

  const accountActionInProgress = submitting || googleSubmitting;

  return (
    <main className="auth-page registration-page">
      <section className="auth-panel registration-panel">
        <div className="auth-brand registration-brand">
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

        <div className="auth-heading registration-heading">
          <span className="eyebrow">JOIN THE COMMUNITY</span>

          <h1>Create your account</h1>

          <p>Begin a safe and purposeful mentoring relationship.</p>
        </div>

        <div className="registration-account-type">
          <label className="registration-field">
            <span>How would you like to use Mentor Connect?</span>

            <div className="registration-select-field">
              <select
                name="role"
                value={form.role}
                onChange={updateForm}
                disabled={accountActionInProgress}
                required
              >
                <option value="" disabled>
                  Select an option
                </option>

                <option value="mentee">I am looking for a mentor</option>

                <option value="mentor">I would like to become a mentor</option>
              </select>

              <ChevronDown
                className="registration-select-icon"
                size={18}
                aria-hidden="true"
              />
            </div>
          </label>
        </div>

        {error && (
          <p className="form-error registration-top-error" role="alert">
            {error}
          </p>
        )}

        <form className="registration-form" onSubmit={handleSubmit}>
          <label className="registration-field">
            <span>Full name</span>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={updateForm}
              autoComplete="name"
              placeholder="Enter your full name"
              disabled={accountActionInProgress}
              required
            />
          </label>

          <label className="registration-field">
            <span>Email address</span>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              autoComplete="email"
              placeholder="Enter your email address"
              disabled={accountActionInProgress}
              required
            />
          </label>

          <label className="registration-field">
            <span>Mobile number</span>

            <input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={updateForm}
              autoComplete="tel"
              placeholder="+234"
              disabled={accountActionInProgress}
              required
            />
          </label>

          <label className="registration-field">
            <span>Password</span>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={updateForm}
                autoComplete="new-password"
                placeholder="Minimum of 8 characters"
                minLength={8}
                disabled={accountActionInProgress}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={accountActionInProgress}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="registration-field">
            <span>Confirm password</span>

            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateForm}
                autoComplete="new-password"
                placeholder="Enter your password again"
                minLength={8}
                disabled={accountActionInProgress}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmed password"
                    : "Show confirmed password"
                }
                disabled={accountActionInProgress}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="registration-terms">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={form.acceptedTerms}
              onChange={updateForm}
              disabled={accountActionInProgress}
              required
            />

            <span>
              I agree to the terms, privacy notice, code of conduct and safety
              guidelines.
            </span>
          </label>

          <button
            type="submit"
            className="registration-submit"
            disabled={accountActionInProgress}
          >
            {submitting ? "Creating account..." : "Create account with email"}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogleSignIn}
          disabled={accountActionInProgress}
        >
          <GoogleIcon />

          {googleSubmitting
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>

        <p className="google-terms-copy">
          By continuing with Google, you agree to the terms, privacy notice,
          code of conduct and safety guidelines.
        </p>

        <p className="account-copy registration-account-copy">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>

      <section className="auth-message registration-message">
        <ShieldCheck size={40} />

        <span className="eyebrow">VERIFIED COMMUNITY</span>

        <h2>Grow through guidance, trust and accountability.</h2>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.94A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.94V7.44H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.56l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.44l3.35 2.62C7.19 7.7 9.4 5.94 12 5.94Z"
      />
    </svg>
  );
}

export default Register;
