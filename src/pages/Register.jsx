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
  const { signUp } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
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
    setError("");

    if (!form.role) {
      setError(
        "Please select how you would like to use Mentor Connect.",
      );
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Your password must contain at least 8 characters.",
      );
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
          <span className="eyebrow">
            JOIN THE COMMUNITY
          </span>

          <h1>Create your account</h1>

          <p>
            Begin a safe and purposeful mentoring relationship.
          </p>
        </div>

        <form
          className="registration-form"
          onSubmit={handleSubmit}
        >
          <label className="registration-field">
            <span>
              How would you like to use Mentor Connect?
            </span>

            <div className="registration-select-field">
              <select
                name="role"
                value={form.role}
                onChange={updateForm}
                required
              >
                <option value="" disabled>
                  Select an option
                </option>

                <option value="mentee">
                  I am looking for a mentor
                </option>

                <option value="mentor">
                  I would like to become a mentor
                </option>
              </select>

              <ChevronDown
                className="registration-select-icon"
                size={18}
                aria-hidden="true"
              />
            </div>
          </label>

          <label className="registration-field">
            <span>Full name</span>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={updateForm}
              autoComplete="name"
              placeholder="Enter your full name"
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

          <label className="registration-field">
            <span>Confirm password</span>

            <div className="password-field">
              <input
                type={
                  showConfirmPassword ? "text" : "password"
                }
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateForm}
                autoComplete="new-password"
                placeholder="Enter your password again"
                minLength={8}
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
                    ? "Hide confirmed password"
                    : "Show confirmed password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <label className="registration-terms">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={form.acceptedTerms}
              onChange={updateForm}
              required
            />

            <span>
              I agree to the terms, privacy notice, code of conduct
              and safety guidelines.
            </span>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="registration-submit"
            disabled={submitting}
          >
            {submitting
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p className="account-copy registration-account-copy">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </section>

      <section className="auth-message registration-message">
        <ShieldCheck size={40} />

        <span className="eyebrow">
          VERIFIED COMMUNITY
        </span>

        <h2>
          Grow through guidance, trust and accountability.
        </h2>
      </section>
    </main>
  );
}

export default Register;