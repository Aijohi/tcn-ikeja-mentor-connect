import { useState } from "react";
import {
  ArrowLeft,
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
  role: "mentee",
  acceptedTerms: false,
};

function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

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
        "You must accept the terms, conduct rules and safety guidelines.",
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
        email: form.email,
      },
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          Return home
        </Link>

        <div className="auth-brand">
          <span className="brand-icon">
            <HeartHandshake size={22} />
          </span>

          <span>
            <strong>Mentor Connect</strong>
            <small>TCN IKEJA</small>
          </span>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">JOIN THE COMMUNITY</span>
          <h1>Create your account</h1>
          <p>
            Begin a safe and purposeful mentoring relationship.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className="role-selection">
            <legend>How would you like to use Mentor Connect?</legend>

            <label
              className={
                form.role === "mentee" ? "role-card selected" : "role-card"
              }
            >
              <input
                type="radio"
                name="role"
                value="mentee"
                checked={form.role === "mentee"}
                onChange={updateForm}
              />

              <span>
                <strong>I am looking for a mentor</strong>
                <small>
                  Find guidance for your career, business, faith or growth.
                </small>
              </span>
            </label>

            <label
              className={
                form.role === "mentor" ? "role-card selected" : "role-card"
              }
            >
              <input
                type="radio"
                name="role"
                value="mentor"
                checked={form.role === "mentor"}
                onChange={updateForm}
              />

              <span>
                <strong>I would like to become a mentor</strong>
                <small>
                  Apply to support members using your experience.
                </small>
              </span>
            </label>
          </fieldset>

          <label>
            Full name

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Email address

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Mobile number

            <input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={updateForm}
              placeholder="+234"
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
                minLength={8}
                required
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Confirm password

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={updateForm}
              minLength={8}
              required
            />
          </label>

          <label className="terms-checkbox">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={form.acceptedTerms}
              onChange={updateForm}
            />

            <span>
              I agree to the terms, privacy notice, code of conduct and safety
              guidelines.
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="primary-button full-button"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="account-copy">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>

      <section className="auth-message">
        <ShieldCheck size={40} />
        <span className="eyebrow">VERIFIED COMMUNITY</span>
        <h2>Grow through guidance, trust and accountability.</h2>
      </section>
    </main>
  );
}

export default Register;