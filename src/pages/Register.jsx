import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  useLayoutEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "./Register.css";

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  role: "",
  acceptedTerms: false,
};

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function getRegistrationError(
  signUpError,
  signUpData,
  isMenteeHandoff,
) {
  const message =
    String(
      signUpError?.message ||
        "",
    ).toLowerCase();

  const duplicateEmail =
    message.includes(
      "already registered",
    ) ||
    message.includes(
      "already exists",
    ) ||
    message.includes(
      "user already",
    ) ||
    (
      signUpData?.user &&
      Array.isArray(
        signUpData.user.identities,
      ) &&
      signUpData.user.identities.length ===
        0
    );

  if (duplicateEmail) {
    if (isMenteeHandoff) {
      return "That email address is already connected to an account. Your mentee account must use a different email from your mentor account.";
    }

    return "This email address has already been used to create an account. Please sign in or try another email address.";
  }

  return (
    signUpError?.message ||
    "Your account could not be created. Please try again."
  );
}

function Register() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const isMenteeHandoff =
    searchParams.get(
      "account",
    ) === "mentee" &&
    searchParams.get(
      "from",
    ) === "mentor";

  const registrationDraftKey =
    isMenteeHandoff
      ? "mentorConnectRegistrationDraft:menteeHandoff"
      : "mentorConnectRegistrationDraft:standard";

  const {
    signUp,
    signInWithGoogle,
  } = useAuth();

  const [
    form,
    setForm,
  ] = useState(() => {
    let savedDraft = null;

    try {
      const storedDraft =
        window.sessionStorage.getItem(
          registrationDraftKey,
        );

      if (storedDraft) {
        savedDraft =
          JSON.parse(
            storedDraft,
          );
      }
    } catch (error) {
      console.warn(
        "Unable to restore registration draft:",
        error,
      );
    }

    return {
      ...initialForm,
      ...savedDraft,
      password: "",
      confirmPassword: "",
      role:
        isMenteeHandoff
          ? "mentee"
          : (
              savedDraft?.role ||
              ""
            ),
    };
  });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    googleSubmitting,
    setGoogleSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

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

  function updateForm(
    event,
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      }),
    );

    setError("");
  }

  function saveRegistrationDraft() {
    const draft = {
      fullName:
        form.fullName,
      email:
        form.email,
      phoneNumber:
        form.phoneNumber,
      role:
        form.role,
      acceptedTerms:
        form.acceptedTerms,
    };

    try {
      window.sessionStorage.setItem(
        registrationDraftKey,
        JSON.stringify(
          draft,
        ),
      );
    } catch (error) {
      console.warn(
        "Unable to save registration draft:",
        error,
      );
    }
  }

  function clearRegistrationDraft() {
    try {
      window.sessionStorage.removeItem(
        registrationDraftKey,
      );
    } catch (error) {
      console.warn(
        "Unable to clear registration draft:",
        error,
      );
    }
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");

    if (!form.role) {
      setError(
        "Please choose whether you want to join as a mentee or mentor.",
      );
      return;
    }

    if (
      form.password.length <
      8
    ) {
      setError(
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Your passwords do not match.",
      );
      return;
    }

    if (
      !form.acceptedTerms
    ) {
      setError(
        "Please agree to the Terms & Conditions before creating your account.",
      );
      return;
    }

    setSubmitting(true);

    const {
      data:
        signUpData,
      error:
        signUpError,
    } = await signUp({
      fullName:
        form.fullName.trim(),
      email:
        form.email
          .trim()
          .toLowerCase(),
      phoneNumber:
        form.phoneNumber.trim(),
      password:
        form.password,
      role:
        form.role,
    });

    setSubmitting(false);

    if (
      signUpError ||
      (
        signUpData?.user &&
        Array.isArray(
          signUpData.user
            .identities,
        ) &&
        signUpData.user
          .identities.length ===
          0
      )
    ) {
      setError(
        getRegistrationError(
          signUpError,
          signUpData,
          isMenteeHandoff,
        ),
      );
      return;
    }

    clearRegistrationDraft();

    navigate(
      "/check-email",
      {
        state: {
          email:
            form.email
              .trim()
              .toLowerCase(),
          accountType:
            form.role,
        },
      },
    );
  }

  async function handleGoogleSignIn() {
    setError("");

    if (!form.role) {
      setError(
        "Please choose whether you want to join as a mentee or mentor before continuing with Google.",
      );
      return;
    }

    setGoogleSubmitting(true);

    const {
      error:
        googleError,
    } =
      await signInWithGoogle(
        form.role,
      );

    if (googleError) {
      setError(
        googleError.message ||
          "Google registration could not be started. Please try again.",
      );

      setGoogleSubmitting(
        false,
      );
    }
  }

  const busy =
    submitting ||
    googleSubmitting;

  return (
    <main className="register-page">
      <section className="register-form-side">
        <div className="register-form-inner">
          <div className="register-brand-row">
            <Link
              to="/"
              className="register-brand"
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

          <div className="register-heading">
            <span>
              {isMenteeHandoff
                ? "MENTEE ACCOUNT"
                : "JOIN THE COMMUNITY"}
            </span>

            <h1>
              Create your account
            </h1>

            <p>
              {isMenteeHandoff
                ? "Create a separate mentee account to receive mentoring support."
                : "Begin a safe and purposeful mentoring relationship."}
            </p>
          </div>

          {isMenteeHandoff && (
            <div className="register-account-context">
              <strong>
                Creating a mentee account
              </strong>

              <p>
                Use a different email address
                from your mentor account.
              </p>
            </div>
          )}

          {error && (
            <p
              className="register-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            className="register-form"
            onSubmit={
              handleSubmit
            }
          >
            <label className="register-field">
              <span>
                {isMenteeHandoff
                  ? "Account type"
                  : "How would you like to use Mentor Connect?"}
              </span>

              <div className="register-select-wrap">
                <select
                  name="role"
                  value={
                    form.role
                  }
                  onChange={
                    updateForm
                  }
                  disabled={
                    busy ||
                    isMenteeHandoff
                  }
                  required
                >
                  {!isMenteeHandoff && (
                    <option value="">
                      Select an option
                    </option>
                  )}

                  <option value="mentee">
                    I need a mentor
                  </option>

                  {!isMenteeHandoff && (
                    <option value="mentor">
                      I want to mentor
                    </option>
                  )}
                </select>

                <ChevronDown
                  size={18}
                  aria-hidden="true"
                />
              </div>
            </label>

            <label className="register-field">
              <span>
                Full name
              </span>

              <input
                type="text"
                name="fullName"
                value={
                  form.fullName
                }
                onChange={
                  updateForm
                }
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={
                  busy
                }
                required
              />
            </label>

            <label className="register-field">
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
                placeholder={
                  isMenteeHandoff
                    ? "Use a different email address"
                    : "Enter your email address"
                }
                autoComplete="email"
                disabled={
                  busy
                }
                required
              />

              {isMenteeHandoff && (
                <small>
                  Do not use your mentor
                  account email.
                </small>
              )}
            </label>

            <label className="register-field">
              <span>
                Mobile number
              </span>

              <input
                type="tel"
                name="phoneNumber"
                value={
                  form.phoneNumber
                }
                onChange={
                  updateForm
                }
                placeholder="Enter your mobile number"
                autoComplete="tel"
                inputMode="tel"
                disabled={
                  busy
                }
                required
              />
            </label>

            <label className="register-field">
              <span>
                Password
              </span>

              <div className="register-password-wrap">
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
                  placeholder="Minimum of 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={
                    busy
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={
                    busy
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

            <label className="register-field">
              <span>
                Confirm password
              </span>

              <div className="register-password-wrap">
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  value={
                    form.confirmPassword
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={
                    busy
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  disabled={
                    busy
                  }
                >
                  {showConfirmPassword ? (
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

            <label className="register-terms">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={
                  form.acceptedTerms
                }
                onChange={
                  updateForm
                }
                disabled={
                  busy
                }
                required
              />

              <span>
                I agree to the{" "}
                <Link
                  to="/terms?from=register"
                  onClick={
                    saveRegistrationDraft
                  }
                >
                  Terms &amp; Conditions
                </Link>
                , Privacy Notice, Code of
                Conduct and Safety Guidelines.
              </span>
            </label>

            <button
              type="submit"
              className="register-submit"
              disabled={
                busy
              }
            >
              <span>
                {submitting
                  ? "Creating account..."
                  : "Create account"}
              </span>

              {!submitting && (
                <ArrowRight
                  size={17}
                />
              )}
            </button>
          </form>

          <div className="register-divider">
            <span>
              or
            </span>
          </div>

          <button
            type="button"
            className="register-google"
            onClick={
              handleGoogleSignIn
            }
            disabled={
              busy
            }
          >
            <GoogleIcon />

            {googleSubmitting
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          <p className="register-bottom-signin">
            Already have an account?{" "}

            <Link
              to={
                isMenteeHandoff
                  ? "/login?account=mentee&from=mentor"
                  : "/login"
              }
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <aside
        className="register-visual-side"
        aria-hidden="true"
      >
        <div className="register-visual-canvas">
          <div className="register-artwork">
            <span className="register-artwork-halo" />
            <span className="register-artwork-ring register-artwork-ring--one" />
            <span className="register-artwork-ring register-artwork-ring--two" />
            <span className="register-artwork-orb" />
            <span className="register-artwork-reflection" />
            <span className="register-artwork-dot register-artwork-dot--one" />
            <span className="register-artwork-dot register-artwork-dot--two" />
          </div>

          <div className="register-side-note">
            <span>
              A STRONGER
            </span>

            <span>
              TOMORROW
            </span>

            <span>
              TOGETHER
            </span>

            <i />
          </div>

          <div className="register-right-message">
            <p>
              PEOPLE EMPOWER PEOPLE
            </p>

            <span />

            <small>
              MENTOR&nbsp;&nbsp;|&nbsp;&nbsp;
              LEARN&nbsp;&nbsp;|&nbsp;&nbsp;
              GROW&nbsp;&nbsp;|&nbsp;&nbsp;
              TRANSFORM
            </small>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default Register;
