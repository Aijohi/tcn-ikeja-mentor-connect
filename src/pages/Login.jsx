import { useState } from "react";
import {
  Eye,
  EyeOff,
  HeartHandshake,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
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
      setError(
        "The email address or password you entered is incorrect.",
      );
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
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

    setError("Your account does not have a recognised role.");
  }

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
          <span className="eyebrow">
            WELCOME BACK
          </span>

          <h1>Continue your mentoring journey.</h1>

          <p>
            Sign in using the email connected to your account.
          </p>
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
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <div className="form-options">
            <span />

            <Link
              to="/forgot-password"
              className="forgot-link"
            >
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
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="account-copy">
          New to Mentor Connect?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </p>
      </section>

      <section className="auth-message">
        <span className="eyebrow">
          GROW WITH GUIDANCE
        </span>

        <h2>
          Purposeful conversations. Meaningful growth.
        </h2>
      </section>
    </main>
  );
}

export default Login;