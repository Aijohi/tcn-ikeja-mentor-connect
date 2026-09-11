import { useState } from "react";
import {
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function AdminLogin() {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();

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
      setError("The administrator credentials are incorrect.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await signOut();
      setSubmitting(false);
      setError("We could not verify your administrator profile.");
      return;
    }

    const administratorRoles = ["admin", "super_admin", "safeguarding_lead"];

    if (!administratorRoles.includes(profile.role)) {
      await signOut();
      setSubmitting(false);
      setError("This account does not have administrator access.");
      return;
    }

    if (profile.account_status !== "active") {
      await signOut();
      setSubmitting(false);
      setError("This administrator account is not active.");
      return;
    }

    setSubmitting(false);
    navigate("/admin/dashboard", { replace: true });
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <div className="admin-auth-brand">
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

        <span className="admin-icon">
          <ShieldCheck size={30} />
        </span>

        <span className="eyebrow">TCN IKEJA ADMINISTRATION</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage the TCN Ikeja mentoring community.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Work email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              autoComplete="email"
              disabled={submitting}
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
                disabled={submitting}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

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
            <LockKeyhole size={17} />
            {submitting ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <Link to="/forgot-password" className="admin-forgot-link">
          Forgot password?
        </Link>

        <div className="restricted-notice">
          <ShieldCheck size={18} />

          <span>
            Administrator access is restricted to authorised TCN Ikeja
            personnel.
          </span>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;
