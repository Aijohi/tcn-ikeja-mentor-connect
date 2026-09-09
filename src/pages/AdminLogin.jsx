import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function AdminLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    const { data, error: loginError } = await signIn(
      form.email.trim(),
      form.password,
    );

    if (loginError) {
      setSubmitting(false);
      setError("The administrator credentials are incorrect.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", data.user.id)
      .single();

    setSubmitting(false);

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("We could not verify your administrator profile.");
      return;
    }

    const administratorRoles = ["admin", "safeguarding_lead"];

    if (!administratorRoles.includes(profile.role)) {
      await supabase.auth.signOut();
      setError("This account does not have administrator access.");
      return;
    }

    if (profile.account_status !== "active") {
      await supabase.auth.signOut();
      setError("This administrator account is not active.");
      return;
    }

    navigate("/admin/dashboard");
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
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
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateForm}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

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
          Administrator access is restricted to authorized TCN Ikeja
          personnel.
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;