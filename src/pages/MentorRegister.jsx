import {
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorRegister.css";

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

function MentorRegister() {
  const navigate = useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const {
    signUpApprovedMentor,
    signOut,
  } = useAuth();

  const invitationToken =
    searchParams.get("invite")?.trim() ||
    "";

  const [
    invitation,
    setInvitation,
  ] = useState(null);

  const [
    checkingInvitation,
    setCheckingInvitation,
  ] = useState(true);

  const [
    form,
    setForm,
  ] = useState(initialForm);

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
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function validateInvitation() {
      setCheckingInvitation(true);
      setError("");

      if (!invitationToken) {
        if (!isMounted) {
          return;
        }

        setInvitation({
          is_valid: false,
          invitation_state:
            "invalid",
        });

        setCheckingInvitation(
          false,
        );

        return;
      }

      const {
        data,
        error:
          invitationError,
      } = await supabase.rpc(
        "validate_mentor_account_invitation",
        {
          p_token:
            invitationToken,
        },
      );

      if (!isMounted) {
        return;
      }

      if (invitationError) {
        console.error(
          "Unable to validate mentor invitation:",
          invitationError,
        );

        setError(
          "We could not validate this mentor invitation. Please try again.",
        );

        setInvitation(null);
        setCheckingInvitation(
          false,
        );

        return;
      }

      const result =
        Array.isArray(data)
          ? data[0]
          : data;

      setInvitation(
        result ?? {
          is_valid: false,
          invitation_state:
            "invalid",
        },
      );

      if (
        result?.is_valid &&
        result?.applicant_name
      ) {
        setForm(
          (current) => ({
            ...current,
            fullName:
              result.applicant_name,
          }),
        );
      }

      setCheckingInvitation(
        false,
      );
    }

    validateInvitation();

    return () => {
      isMounted = false;
    };
  }, [invitationToken]);

  function updateForm(event) {
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
          type === "checkbox"
            ? checked
            : value,
      }),
    );

    setError("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");

    if (
      !invitation?.is_valid
    ) {
      setError(
        "This mentor invitation is not available for registration.",
      );

      return;
    }

    if (
      !form.fullName.trim()
    ) {
      setError(
        "Please enter your full name.",
      );

      return;
    }

    if (!form.email.trim()) {
      setError(
        "Please enter the email address for your mentor account.",
      );

      return;
    }

    if (
      form.password.length < 8
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
      !form.termsAccepted
    ) {
      setError(
        "Please agree to the platform terms before creating your mentor account.",
      );

      return;
    }

    setSubmitting(true);

    const {
      data,
      error:
        signUpError,
    } =
      await signUpApprovedMentor({
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
        invitationToken,
      });

    if (signUpError) {
      console.error(
        "Unable to create mentor account:",
        signUpError,
      );

      const message =
        String(
          signUpError.message ||
            "",
        ).toLowerCase();

      if (
        message.includes(
          "different email",
        )
      ) {
        setError(
          "Your mentor account must use a different email address from your mentee account.",
        );
      } else if (
        message.includes(
          "already registered",
        ) ||
        message.includes(
          "already exists",
        )
      ) {
        setError(
          "That email address is already connected to an account. Please use a different email address.",
        );
      } else if (
        message.includes(
          "invalid",
        ) ||
        message.includes(
          "expired",
        ) ||
        message.includes(
          "already been used",
        )
      ) {
        setError(
          "This mentor invitation is no longer valid. Return to your mentor application and create a new invitation.",
        );
      } else {
        setError(
          signUpError.message ||
            "We could not create your mentor account. Please try again.",
        );
      }

      setSubmitting(false);
      return;
    }

    const identities =
      data?.user?.identities;

    if (
      Array.isArray(
        identities,
      ) &&
      identities.length === 0
    ) {
      setError(
        "That email address is already connected to an account. Please use a different email address.",
      );

      setSubmitting(false);
      return;
    }

    /*
      If email confirmation is disabled in Supabase,
      a session can be returned immediately.

      We still sign the new mentor account out so the
      user enters the mentor platform through the normal
      sign-in page.
    */
    if (data?.session) {
      await signOut();

      navigate(
        "/login",
        {
          replace: true,
          state: {
            mentorAccountCreated:
              true,
          },
        },
      );

      return;
    }

    navigate(
      "/check-email",
      {
        replace: true,
        state: {
          email:
            form.email
              .trim()
              .toLowerCase(),
          accountType:
            "mentor",
        },
      },
    );
  }

  if (checkingInvitation) {
    return (
      <main className="mentor-register-page">
        <section className="mentor-register-state-card">
          <div className="loader" />

          <h1>
            Checking your invitation
          </h1>

          <p>
            Please wait while we
            confirm your approved
            mentor application.
          </p>
        </section>
      </main>
    );
  }

  if (
    !invitation?.is_valid
  ) {
    return (
      <InvalidInvitation
        state={
          invitation
            ?.invitation_state
        }
        error={error}
      />
    );
  }

  return (
    <main className="mentor-register-page">
      <section className="mentor-register-shell">
        <div className="mentor-register-form-side">
          <Link
            to="/"
            className="mentor-register-brand"
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

          <div className="mentor-register-heading">
            <span>
              APPROVED MENTOR
            </span>

            <h1>
              Create your mentor
              account
            </h1>

            <p>
              Your mentor application
              has been approved. Create
              a separate account to
              access the mentor
              platform.
            </p>
          </div>

          <div className="mentor-register-approved-notice">
            <CheckCircle2
              size={19}
              strokeWidth={1.9}
            />

            <div>
              <strong>
                Application approved
              </strong>

              <p>
                {invitation.applicant_name
                  ? `${invitation.applicant_name}, your approved application is ready to connect to a mentor account.`
                  : "Your approved application is ready to connect to a mentor account."}
              </p>
            </div>
          </div>

          <div className="mentor-register-email-notice">
            <ShieldCheck
              size={18}
              strokeWidth={1.9}
            />

            <p>
              Use a{" "}
              <strong>
                different email address
              </strong>{" "}
              from your mentee account.
              Your existing mentee
              account will remain
              unchanged.
            </p>
          </div>

          {error && (
            <p
              className="mentor-register-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            className="mentor-register-form"
            onSubmit={
              handleSubmit
            }
          >
            <label className="mentor-register-field">
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
                  submitting
                }
                required
              />
            </label>

            <label className="mentor-register-field">
              <span>
                Mentor account email
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
                placeholder="Use a different email address"
                autoComplete="email"
                disabled={
                  submitting
                }
                required
              />

              <small>
                This email must be
                different from the
                email used for your
                mentee account.
              </small>
            </label>

            <label className="mentor-register-field">
              <span>
                Phone number{" "}
                <small>
                  Optional
                </small>
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
                placeholder="Enter your phone number"
                autoComplete="tel"
                disabled={
                  submitting
                }
              />
            </label>

            <label className="mentor-register-field">
              <span>
                Password
              </span>

              <div className="mentor-register-password-wrap">
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
                  placeholder="Create a password"
                  autoComplete="new-password"
                  disabled={
                    submitting
                  }
                  minLength="8"
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
                    submitting
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

              <small>
                Use at least 8
                characters.
              </small>
            </label>

            <label className="mentor-register-field">
              <span>
                Confirm password
              </span>

              <div className="mentor-register-password-wrap">
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
                  placeholder="Enter the password again"
                  autoComplete="new-password"
                  disabled={
                    submitting
                  }
                  minLength="8"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  disabled={
                    submitting
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

            <label className="mentor-register-terms">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={
                  form.termsAccepted
                }
                onChange={
                  updateForm
                }
                disabled={
                  submitting
                }
              />

              <span>
                I agree to use Mentor
                Connect responsibly and
                follow the mentoring
                community guidelines.
              </span>
            </label>

            <button
              type="submit"
              className="mentor-register-submit"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Creating mentor account..."
                : "Create mentor account"}
            </button>
          </form>

          <p className="mentor-register-sign-in-copy">
            Already created your
            mentor account?{" "}

            <Link to="/login">
              Sign in
            </Link>
          </p>
        </div>

        <aside
          className="mentor-register-information-side"
          aria-hidden="true"
        >
          <div className="mentor-register-information-content">
            <span>
              MENTOR ACCESS
            </span>

            <h2>
              One approved application.
              One separate mentor
              account.
            </h2>

            <p>
              Your mentoring profile is
              created from the
              application already
              approved by the
              administration team.
            </p>

            <div className="mentor-register-information-line" />

            <small>
              Your mentee account and
              mentor account remain
              separate.
            </small>
          </div>
        </aside>
      </section>
    </main>
  );
}

function InvalidInvitation({
  state,
  error,
}) {
  const content = {
    expired: {
      title:
        "This invitation has expired",
      description:
        "Return to your mentor application status and create a new mentor account invitation.",
    },

    used: {
      title:
        "This invitation has already been used",
      description:
        "If you already created your mentor account, continue to the sign-in page.",
    },

    replaced: {
      title:
        "This invitation has been replaced",
      description:
        "A newer mentor account invitation was created. Return to your mentor application status and use the latest one.",
    },

    invalid: {
      title:
        "This invitation is not valid",
      description:
        "The link may be incomplete or may no longer be available.",
    },
  };

  const information =
    content[state] ??
    content.invalid;

  return (
    <main className="mentor-register-page">
      <section className="mentor-register-state-card">
        <div className="mentor-register-state-icon">
          <ShieldCheck
            size={27}
            strokeWidth={1.8}
          />
        </div>

        <span className="mentor-register-state-eyebrow">
          MENTOR ACCOUNT
        </span>

        <h1>
          {information.title}
        </h1>

        <p>
          {error ||
            information.description}
        </p>

        <div className="mentor-register-state-actions">
          <Link
            to="/login"
            className="mentor-register-state-primary"
          >
            Go to sign in
          </Link>

          <Link
            to="/"
            className="mentor-register-state-secondary"
          >
            Return to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

export default MentorRegister;
