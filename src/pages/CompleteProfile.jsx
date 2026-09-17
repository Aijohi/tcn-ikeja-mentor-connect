import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  supabase,
} from "../lib/supabase";

import "./CompleteProfile.css";

const mentorshipCategories = [
  "Career development",
  "Business and entrepreneurship",
  "Leadership",
  "Faith and spiritual growth",
  "Personal development",
  "Product design",
  "Technology",
];

const meetingFormatOptions = [
  "Virtual",
  "In person",
];

const sessionLengthOptions = [
  {
    value: 15,
    label: "15 minutes",
  },
  {
    value: 30,
    label: "30 minutes",
  },
  {
    value: 45,
    label: "45 minutes",
  },
  {
    value: 60,
    label: "1 hour",
  },
];

const initialForm = {
  fullName: "",
  phoneNumber: "",
  membershipVerificationMethod: "",
  membershipReference: "",
  jobTitle: "",
  organisation: "",
  yearsOfExperience: "",
  biography: "",
  expertise: "",
  categories: [],
  languages: "English",
  meetingFormats: ["Virtual"],
  sessionLength: 30,
  maximumActiveMentees: "3",
};

function convertTextToArray(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function CompleteProfile() {
  const navigate =
    useNavigate();

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
  ] = useState(
    initialForm,
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const accountIntent =
    profile?.signup_intent ||
    getGoogleAccountIntent() ||
    "mentee";

  const isMentorSignup =
    accountIntent ===
    "mentor";

  const continueAfterSubmission =
    useCallback(
      () => {
        clearGoogleAccountIntent();

        navigate(
          "/membership-pending",
          {
            replace: true,
          },
        );
      },
      [
        clearGoogleAccountIntent,
        navigate,
      ],
    );

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
          profile
            ?.full_name ||
          user
            .user_metadata
            ?.full_name ||
          user
            .user_metadata
            ?.name ||
          "",
        phoneNumber:
          profile
            ?.phone_number ||
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
    profile,
    user,
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

    if (!isMentorSignup) {
      navigate(
        "/mentee/dashboard",
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
      navigate(
        "/membership-pending",
        {
          replace: true,
        },
      );
    }
  }, [
    isMentorSignup,
    loading,
    navigate,
    profile,
    user,
  ]);

  const needsMembershipReference =
    useMemo(
      () =>
        [
          "service_unit",
          "leader_reference",
        ].includes(
          form
            .membershipVerificationMethod,
        ),
      [
        form
          .membershipVerificationMethod,
      ],
    );

  function updateForm(
    event,
  ) {
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

  function toggleOption(
    field,
    option,
  ) {
    setForm(
      (current) => {
        const currentOptions =
          current[field];

        const selected =
          currentOptions.includes(
            option,
          );

        return {
          ...current,
          [field]: selected
            ? currentOptions.filter(
                (item) =>
                  item !== option,
              )
            : [
                ...currentOptions,
                option,
              ],
        };
      },
    );

    setError("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");

    const expertise =
      convertTextToArray(
        form.expertise,
      );

    const languages =
      convertTextToArray(
        form.languages,
      );

    if (
      !form
        .membershipVerificationMethod
    ) {
      setError(
        "Please select how your TCN Ikeja membership can be verified.",
      );
      return;
    }

    if (
      needsMembershipReference &&
      !form
        .membershipReference
        .trim()
    ) {
      setError(
        "Please provide the requested membership information.",
      );
      return;
    }

    if (
      form.biography
        .trim()
        .length < 50
    ) {
      setError(
        "Please write a biography containing at least 50 characters.",
      );
      return;
    }

    if (!form.jobTitle.trim()) {
      setError(
        "Please enter your current role or occupation.",
      );
      return;
    }

    if (
      form.yearsOfExperience ===
      ""
    ) {
      setError(
        "Please enter your years of experience.",
      );
      return;
    }

    if (expertise.length === 0) {
      setError(
        "Please provide at least one area of expertise.",
      );
      return;
    }

    if (form.categories.length === 0) {
      setError(
        "Please select at least one mentorship area.",
      );
      return;
    }

    if (languages.length === 0) {
      setError(
        "Please provide at least one language.",
      );
      return;
    }

    if (
      form.meetingFormats.length ===
      0
    ) {
      setError(
        "Please select at least one meeting format.",
      );
      return;
    }

    setSubmitting(true);

    const {
      error:
        submissionError,
    } = await supabase.rpc(
      "submit_mentor_onboarding_application",
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
        p_biography:
          form.biography.trim(),
        p_job_title:
          form.jobTitle.trim(),
        p_organisation:
          form.organisation.trim() ||
          null,
        p_expertise:
          expertise,
        p_mentorship_categories:
          form.categories,
        p_languages:
          languages,
        p_meeting_formats:
          form.meetingFormats,
        p_session_length:
          Number(
            form.sessionLength,
          ),
        p_maximum_active_mentees:
          Number(
            form.maximumActiveMentees,
          ),
        p_years_of_experience:
          Number(
            form.yearsOfExperience,
          ),
      },
    );

    if (submissionError) {
      console.error(
        "Unable to submit mentor application:",
        submissionError,
      );

      setError(
        submissionError.message ||
          "We could not submit your mentor application. Please try again.",
      );

      setSubmitting(false);
      return;
    }

    await refreshProfile?.();

    setSubmitting(false);
    continueAfterSubmission();
  }

  if (
    loading ||
    !isMentorSignup
  ) {
    return (
      <main className="page-message">
        <div className="loader" />
        <p>
          Preparing your account...
        </p>
      </main>
    );
  }

  return (
    <main className="mentor-onboarding-page">
      <section className="mentor-onboarding-shell">
        <header className="mentor-onboarding-heading">
          <span className="mentor-onboarding-eyebrow">
            MENTOR APPLICATION
          </span>

          <h1>
            Complete your mentor application
          </h1>

          <p>
            Submit your membership information and mentor details once. The TCN Ikeja team will review the complete application from here.
          </p>
        </header>

        <form
          className="mentor-onboarding-form"
          onSubmit={
            handleSubmit
          }
        >
          <section className="mentor-onboarding-card">
            <div className="mentor-onboarding-card-heading">
              <span>1</span>
              <div>
                <h2>
                  Your details and membership
                </h2>
                <p>
                  Tell us who you are and how the team can confirm your TCN Ikeja membership.
                </p>
              </div>
            </div>

            <div className="mentor-onboarding-grid">
              <label>
                Full name
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

              <label>
                Email address
                <input
                  type="email"
                  value={
                    user?.email ||
                    ""
                  }
                  readOnly
                  disabled
                />
              </label>

              <label>
                Mobile number
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

              <label>
                How should we verify your membership?
                <div className="mentor-onboarding-select-field">
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
                      My service unit or department
                    </option>
                    <option value="leader_reference">
                      A TCN leader who knows me
                    </option>
                    <option value="manual_admin_review">
                      Administration team review
                    </option>
                  </select>

                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                  />
                </div>
              </label>
            </div>

            {needsMembershipReference && (
              <label>
                {form.membershipVerificationMethod ===
                "service_unit"
                  ? "Service unit or department"
                  : "TCN leader's full name"}

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
                      : "Enter the leader's full name"
                  }
                  disabled={
                    submitting
                  }
                  required
                />
              </label>
            )}
          </section>

          <section className="mentor-onboarding-card">
            <div className="mentor-onboarding-card-heading">
              <span>2</span>
              <div>
                <h2>
                  Your experience
                </h2>
                <p>
                  Help the review team understand your background and what you can support mentees with.
                </p>
              </div>
            </div>

            <div className="mentor-onboarding-grid">
              <label>
                Current role or occupation
                <input
                  type="text"
                  name="jobTitle"
                  value={
                    form.jobTitle
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="For example, Product designer"
                  disabled={
                    submitting
                  }
                  required
                />
              </label>

              <label>
                Organisation
                <input
                  type="text"
                  name="organisation"
                  value={
                    form.organisation
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="Optional"
                  disabled={
                    submitting
                  }
                />
              </label>

              <label>
                Years of experience
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={
                    form.yearsOfExperience
                  }
                  onChange={
                    updateForm
                  }
                  min="0"
                  max="70"
                  placeholder="For example, 5"
                  disabled={
                    submitting
                  }
                  required
                />
              </label>

              <label>
                Languages
                <input
                  type="text"
                  name="languages"
                  value={
                    form.languages
                  }
                  onChange={
                    updateForm
                  }
                  placeholder="English, Yoruba"
                  disabled={
                    submitting
                  }
                  required
                />
                <small>
                  Separate multiple languages with commas.
                </small>
              </label>
            </div>

            <label>
              Short biography
              <textarea
                name="biography"
                value={
                  form.biography
                }
                onChange={
                  updateForm
                }
                rows={5}
                minLength={50}
                placeholder="Briefly introduce yourself, your experience and the kind of guidance you can offer."
                disabled={
                  submitting
                }
                required
              />
              <small>
                {form.biography.trim().length}/50 minimum characters
              </small>
            </label>

            <label>
              Areas of expertise
              <input
                type="text"
                name="expertise"
                value={
                  form.expertise
                }
                onChange={
                  updateForm
                }
                placeholder="Product design, leadership, career growth"
                disabled={
                  submitting
                }
                required
              />
              <small>
                Separate each area with a comma.
              </small>
            </label>

            <fieldset className="mentor-onboarding-options">
              <legend>
                Areas you want to mentor in
              </legend>

              <div className="mentor-onboarding-option-grid mentor-onboarding-option-grid--categories">
                {mentorshipCategories.map(
                  (category) => (
                    <label
                      key={
                        category
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.categories.includes(
                            category,
                          )
                        }
                        onChange={() =>
                          toggleOption(
                            "categories",
                            category,
                          )
                        }
                        disabled={
                          submitting
                        }
                      />
                      <span>
                        {category}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          </section>

          <section className="mentor-onboarding-card">
            <div className="mentor-onboarding-card-heading">
              <span>3</span>
              <div>
                <h2>
                  Mentoring preferences
                </h2>
                <p>
                  Choose how you would prefer to conduct sessions. You can change these preferences after approval.
                </p>
              </div>
            </div>

            <fieldset className="mentor-onboarding-options">
              <legend>
                Meeting format
              </legend>

              <div className="mentor-onboarding-option-grid">
                {meetingFormatOptions.map(
                  (format) => (
                    <label
                      key={
                        format
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.meetingFormats.includes(
                            format,
                          )
                        }
                        onChange={() =>
                          toggleOption(
                            "meetingFormats",
                            format,
                          )
                        }
                        disabled={
                          submitting
                        }
                      />
                      <span>
                        {format}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <fieldset className="mentor-onboarding-options">
              <legend>
                Preferred session length
              </legend>

              <div className="mentor-onboarding-option-grid mentor-onboarding-radio-grid">
                {sessionLengthOptions.map(
                  (option) => (
                    <label
                      key={
                        option.value
                      }
                    >
                      <input
                        type="radio"
                        name="sessionLength"
                        value={
                          option.value
                        }
                        checked={
                          Number(
                            form.sessionLength,
                          ) ===
                          option.value
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              sessionLength:
                                Number(
                                  event.target.value,
                                ),
                            }),
                          )
                        }
                        disabled={
                          submitting
                        }
                      />
                      <span>
                        {option.label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <label>
              Maximum number of active mentees
              <div className="mentor-onboarding-select-field">
                <select
                  name="maximumActiveMentees"
                  value={
                    form.maximumActiveMentees
                  }
                  onChange={
                    updateForm
                  }
                  disabled={
                    submitting
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(
                    (number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        {number} {number === 1 ? "mentee" : "mentees"}
                      </option>
                    ),
                  )}
                </select>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                />
              </div>
            </label>
          </section>

          <div className="mentor-onboarding-review-note">
            <ShieldCheck
              size={19}
              aria-hidden="true"
            />
            <p>
              This is your only mentor application submission step. The administration team will review your membership information and mentor details together.
            </p>
          </div>

          {error && (
            <p
              className="form-error mentor-onboarding-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mentor-onboarding-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Submitting application..."
                : "Submit mentor application"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CompleteProfile;
