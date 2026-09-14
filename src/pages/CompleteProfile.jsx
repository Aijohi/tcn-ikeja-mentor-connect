import {
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./CompleteProfile.css";

const initialForm = {
  fullName: "",
  phoneNumber: "",
  membershipVerificationMethod: "",
  membershipReference: "",
};

function CompleteProfile() {
  const navigate = useNavigate();

  const {
    user,
    profile,
    loading,
    refreshProfile,
    getGoogleAccountIntent,
    clearGoogleAccountIntent,
  } = useAuth();

  const [
    form,
    setForm,
  ] = useState(initialForm);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const continueAfterProfileCompletion =
    useCallback(() => {
      const accountIntent =
        getGoogleAccountIntent();

      clearGoogleAccountIntent();

      if (
        accountIntent === "mentor"
      ) {
        navigate(
          "/mentee/become-a-mentor",
          {
            replace: true,
          },
        );

        return;
      }

      navigate(
        "/membership-pending",
        {
          replace: true,
        },
      );
    }, [
      clearGoogleAccountIntent,
      getGoogleAccountIntent,
      navigate,
    ]);

  useEffect(() => {
    if (
      loading ||
      !user
    ) {
      return;
    }

    setForm(
      (current) => ({
        ...current,

        fullName:
          profile?.full_name ||
          user.user_metadata
            ?.full_name ||
          user.user_metadata
            ?.name ||
          "",

        phoneNumber:
          profile?.phone_number ||
          "",

        membershipVerificationMethod:
          profile
            ?.membership_verification_method ||
          "",

        membershipReference:
          profile
            ?.membership_reference ||
          "",
      }),
    );
  }, [
    loading,
    user,
    profile,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      navigate(
        "/login",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      profile
        ?.onboarding_completed
    ) {
      continueAfterProfileCompletion();
    }
  }, [
    loading,
    user,
    profile,
    navigate,
    continueAfterProfileCompletion,
  ]);

  function updateForm(event) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,

        ...(name ===
        "membershipVerificationMethod"
          ? {
              membershipReference:
                "",
            }
          : {}),
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
      !form.membershipVerificationMethod
    ) {
      setError(
        "Please select how your TCN Ikeja membership can be verified.",
      );

      return;
    }

    setSubmitting(true);

    const {
      error:
        profileError,
    } = await supabase.rpc(
      "complete_member_profile",
      {
        p_full_name:
          form.fullName.trim(),

        p_phone_number:
          form.phoneNumber.trim(),

        p_membership_verification_method:
          form.membershipVerificationMethod,

        p_membership_reference:
          form.membershipReference.trim() ||
          null,
      },
    );

    if (profileError) {
      console.error(
        "Unable to complete profile:",
        profileError,
      );

      setError(
        profileError.message ||
          "We could not save your profile. Please try again.",
      );

      setSubmitting(false);

      return;
    }

    await refreshProfile();

    setSubmitting(false);

    continueAfterProfileCompletion();
  }

  const needsMembershipReference =
    [
      "service_unit",
      "leader_reference",
    ].includes(
      form.membershipVerificationMethod,
    );

  if (loading) {
    return (
      <main className="complete-profile-page">
        <section className="complete-profile-loading">
          <div className="loader" />

          <p>
            Preparing your profile...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="complete-profile-page">
      <section className="complete-profile-card">
        <Link
          to="/"
          className="complete-profile-brand"
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

        <div className="complete-profile-heading">
          <span>
            MEMBERSHIP INFORMATION
          </span>

          <h1>
            Complete your profile
          </h1>

          <p>
            Add the details needed to
            verify your TCN Ikeja
            membership.
          </p>
        </div>

        <form
          className="complete-profile-form"
          onSubmit={
            handleSubmit
          }
        >
          <label className="complete-profile-field">
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
              autoComplete="name"
              disabled={
                submitting
              }
              required
            />
          </label>

          <label className="complete-profile-field">
            <span>
              Email address
            </span>

            <input
              type="email"
              value={
                user?.email ||
                ""
              }
              disabled
              readOnly
            />
          </label>

          <label className="complete-profile-field">
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
              placeholder="For example, +234 801 234 5678"
              autoComplete="tel"
              disabled={
                submitting
              }
              required
            />
          </label>

          <label className="complete-profile-field">
            <span>
              How should we verify
              your membership?
            </span>

            <div className="complete-profile-select-field">
              <select
                name="membershipVerificationMethod"
                value={
                  form.membershipVerificationMethod
                }
                onChange={
                  updateForm
                }
                disabled={
                  submitting
                }
                required
              >
                <option
                  value=""
                  disabled
                >
                  Select an option
                </option>

                <option value="service_unit">
                  My service unit or
                  department
                </option>

                <option value="leader_reference">
                  A TCN leader who
                  knows me
                </option>

                <option value="manual_admin_review">
                  Administration team
                  review
                </option>
              </select>

              <ChevronDown
                className="complete-profile-select-icon"
                size={17}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
          </label>

          {needsMembershipReference && (
            <label className="complete-profile-field">
              <span>
                {form.membershipVerificationMethod ===
                "service_unit"
                  ? "Service unit or department"
                  : "TCN leader’s full name"}
              </span>

              <input
                type="text"
                name="membershipReference"
                value={
                  form.membershipReference
                }
                onChange={
                  updateForm
                }
                placeholder={
                  form.membershipVerificationMethod ===
                  "service_unit"
                    ? "Enter your service unit or department"
                    : "Enter the leader’s full name"
                }
                disabled={
                  submitting
                }
                required
              />
            </label>
          )}

          <div className="complete-profile-notice">
            <ShieldCheck
              size={17}
              strokeWidth={1.8}
            />

            <p>
              Your account will remain
              pending until an
              administrator verifies
              your membership.
            </p>
          </div>

          {error && (
            <p
              className="complete-profile-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="complete-profile-submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? "Saving profile..."
              : "Submit membership details"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default CompleteProfile;
