import { useState } from "react";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const {
    signIn,
    signOut,
  } = useAuth();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  function updateForm(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    const {
      data,
      error: loginError,
    } = await signIn(
      form.email.trim(),
      form.password,
    );

    if (
      loginError ||
      !data?.user
    ) {
      setSubmitting(false);

      setError(
        "The administrator credentials are incorrect.",
      );

      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, account_status",
      )
      .eq(
        "id",
        data.user.id,
      )
      .single();

    if (
      profileError ||
      !profile
    ) {
      await signOut();

      setSubmitting(false);

      setError(
        "We could not verify your administrator profile.",
      );

      return;
    }

    const administratorRoles = [
      "admin",
      "super_admin",
      "safeguarding_lead",
    ];

    if (
      !administratorRoles.includes(
        profile.role,
      )
    ) {
      await signOut();

      setSubmitting(false);

      setError(
        "This account does not have administrator access.",
      );

      return;
    }

    if (
      profile.account_status !==
      "active"
    ) {
      await signOut();

      setSubmitting(false);

      setError(
        "This administrator account is not active.",
      );

      return;
    }

    setSubmitting(false);

    navigate(
      "/admin/dashboard",
      {
        replace: true,
      },
    );
  }

  return (
    <main className="admin-login-page">
      <div
        className="admin-login-pattern"
        aria-hidden="true"
      />

      <section className="admin-login-shell">
        <div className="admin-login-card">
          <Link
            to="/"
            className="admin-login-brand"
            aria-label="Return to Mentor Connect homepage"
          >
            <img
              src="/images/hothub-logo.png"
              alt=""
              className="admin-login-logo"
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

          <div className="admin-login-copy">
            <span className="admin-login-eyebrow">
              TCN IKEJA ADMINISTRATION
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Sign in to manage the
              TCN Ikeja mentoring
              community.
            </p>
          </div>

          <form
            className="admin-login-form"
            onSubmit={handleSubmit}
          >
            <label>
              Work email address

              <input
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={
                  updateForm
                }
                autoComplete="email"
                placeholder="admin@tcnikeja.org"
                disabled={
                  submitting
                }
                required
              />
            </label>

            <label>
              Password

              <div className="admin-password-field">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={
                    form.password
                  }
                  onChange={
                    updateForm
                  }
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={
                    submitting
                  }
                  required
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={
                    submitting
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p
                className="admin-login-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="admin-login-submit"
              disabled={
                submitting
              }
            >
              <LockKeyhole
                size={16}
              />

              <span>
                {submitting
                  ? "Signing in..."
                  : "Sign in securely"}
              </span>
            </button>
          </form>

          <Link
            to="/forgot-password"
            className="admin-forgot-link"
          >
            Forgot password?
          </Link>

          <div className="admin-restricted-notice">
            <ShieldCheck
              size={17}
            />

            <span>
              Administrator access is
              restricted to authorised
              TCN Ikeja personnel.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;
