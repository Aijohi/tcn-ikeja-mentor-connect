import {
  useLayoutEffect,
  useState,
} from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./Login.css";

const administratorRoles = [
  "admin",
  "safeguarding_lead",
];

function GoogleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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

  const {
    signIn,
    signInWithGoogle,
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
    googleSubmitting,
    setGoogleSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useLayoutEffect(() => {
    const previousScrollRestoration =
      "scrollRestoration" in window.history
        ? window.history.scrollRestoration
        : null;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();

    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      window.requestAnimationFrame(resetScroll);
    });

    const timer = window.setTimeout(resetScroll, 120);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(timer);

      if (
        previousScrollRestoration &&
        "scrollRestoration" in window.history
      ) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

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

  async function handleGoogleSignIn() {
    setError("");
    setGoogleSubmitting(true);

    const {
      error: googleError,
    } = await signInWithGoogle();

    if (googleError) {
      console.error(
        "Unable to sign in with Google:",
        googleError,
      );

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
        "The email address or password you entered is incorrect.",
      );

      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, signup_intent, account_status, onboarding_completed",
      )
      .eq(
        "id",
        data.user.id,
      )
      .single();

    setSubmitting(false);

    if (
      profileError ||
      !profile
    ) {
      setError(
        "We could not load your profile.",
      );

      return;
    }

    if (
      profile.account_status ===
      "suspended"
    ) {
      navigate(
        "/account-suspended",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      administratorRoles.includes(
        profile.role,
      )
    ) {
      setError(
        "This is the mentor and mentee sign-in page.",
      );

      return;
    }

    if (
      !profile.onboarding_completed
    ) {
      navigate(
        "/complete-profile",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      profile.account_status ===
        "pending" ||
      profile.account_status ===
        "rejected"
    ) {
      navigate(
        "/membership-pending",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      profile.role === "mentor"
    ) {
      navigate(
        "/mentor/dashboard",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      profile.role === "mentee"
    ) {
      if (
        profile.signup_intent ===
        "mentor"
      ) {
        navigate(
          "/mentor/apply",
          {
            replace: true,
          },
        );

        return;
      }

      navigate(
        "/mentee/dashboard",
        {
          replace: true,
        },
      );

      return;
    }

    setError(
      "Your account does not have a recognised role.",
    );
  }

  const authenticationInProgress =
    submitting ||
    googleSubmitting;

  return (
    <main className="login-page">
      <section className="login-form-side">
        <div className="login-form-inner">
          <div className="login-brand-row">
            <Link
              to="/"
              className="login-brand"
              aria-label="Return to Mentor Connect homepage"
            >
              <img
                src="/images/hothub-logo.png"
                alt="HOTHUB"
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
          </div>

          <div className="login-heading">
            <span>
              WELCOME BACK
            </span>

            <h1>
              Sign in to your account
            </h1>

            <p>
              Continue your mentoring
              journey from where you
              left off.
            </p>
          </div>

          {error && (
            <p
              className="login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            className="login-form"
            onSubmit={
              handleSubmit
            }
          >
            <label className="login-field">
              <span>
                Email address
              </span>

              <input
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={
                  updateForm
                }
                placeholder="Enter your email address"
                autoComplete="email"
                disabled={
                  authenticationInProgress
                }
                required
              />
            </label>

            <label className="login-field">
              <span>
                Password
              </span>

              <div className="login-password-wrap">
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={
                    authenticationInProgress
                  }
                  required
                />

                <button
                  type="button"
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
                    authenticationInProgress
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}
                </button>
              </div>
            </label>

            <div className="login-options">
              <Link
                to="/forgot-password"
                className="login-forgot"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={
                authenticationInProgress
              }
            >
              <span>
                {submitting
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!submitting && (
                <ArrowRight
                  size={17}
                />
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>
              or
            </span>
          </div>

          <button
            type="button"
            className="login-google"
            onClick={
              handleGoogleSignIn
            }
            disabled={
              authenticationInProgress
            }
          >
            <GoogleIcon />

            <span className="login-google-text">
              {googleSubmitting
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>
          </button>

          <p className="login-account-copy">
            New to Mentor Connect?{" "}

            <Link to="/register">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      <aside
        className="login-visual-side"
        aria-hidden="true"
      >
        <div className="login-visual-canvas">
          <div className="login-artwork">
            <span className="login-artwork-halo" />
            <span className="login-artwork-ring login-artwork-ring--one" />
            <span className="login-artwork-ring login-artwork-ring--two" />
            <span className="login-artwork-orb" />
            <span className="login-artwork-reflection" />
            <span className="login-artwork-dot login-artwork-dot--one" />
            <span className="login-artwork-dot login-artwork-dot--two" />
          </div>

          <div className="login-side-note">
            <span>
              GROW WITH
            </span>

            <span>
              GUIDANCE
            </span>

            <i />
          </div>

          <div className="login-right-message">
            <p>
              PURPOSEFUL CONVERSATIONS
            </p>

            <span />

            <small>
              MEANINGFUL GROWTH
            </small>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default Login;
