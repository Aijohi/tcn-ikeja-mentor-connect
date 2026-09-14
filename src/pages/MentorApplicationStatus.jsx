import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  History,
  Pencil,
  RotateCcw,
  Send,
  UserPlus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorApplicationStatus.css";

const meetingFormatOptions = [
  "Virtual",
  "In person",
  "Either",
];

const sessionLengthOptions = [
  30,
  45,
  60,
];

const initialForm = {
  biography: "",
  jobTitle: "",
  organisation: "",
  expertise: "",
  mentorshipCategories: "",
  languages: "English",
  meetingFormats: ["Virtual"],
  sessionLengths: [45],
  maximumActiveMentees: "3",
  yearsOfExperience: "",
};

function convertTextToArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normaliseApplicationForm(data) {
  return {
    biography:
      data?.biography ?? "",

    jobTitle:
      data?.job_title ?? "",

    organisation:
      data?.organisation ?? "",

    expertise:
      (data?.expertise ?? []).join(", "),

    mentorshipCategories:
      (
        data?.mentorship_categories ??
        []
      ).join(", "),

    languages:
      (
        data?.languages ??
        ["English"]
      ).join(", "),

    meetingFormats:
      data?.meeting_formats?.length > 0
        ? data.meeting_formats
        : ["Virtual"],

    sessionLengths:
      data?.session_lengths?.length > 0
        ? data.session_lengths
        : [45],

    maximumActiveMentees:
      String(
        data?.maximum_active_mentees ??
          3,
      ),

    yearsOfExperience:
      data?.years_of_experience ===
        null ||
      data?.years_of_experience ===
        undefined
        ? ""
        : String(
            data.years_of_experience,
          ),
  };
}

function MentorApplicationStatus() {
  const navigate = useNavigate();

  const {
    profile,
    signOut,
    refreshProfile,
  } = useAuth();

  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    selectedApplicationId,
    setSelectedApplicationId,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(initialForm);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    reapplying,
    setReapplying,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    creatingMentorAccount,
    setCreatingMentorAccount,
  ] = useState(false);

  const [
    accountActionError,
    setAccountActionError,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function fetchApplications({
    showLoading = false,
  } = {}) {
    if (!profile?.id) {
      return [];
    }

    if (showLoading) {
      setLoading(true);
    }

    const {
      data,
      error: applicationError,
    } = await supabase
      .from("mentor_applications")
      .select("*")
      .eq(
        "applicant_user_id",
        profile.id,
      )
      .order("created_at", {
        ascending: false,
      });

    if (applicationError) {
      console.error(
        "Unable to load mentor applications:",
        applicationError,
      );

      setError(
        "We could not load your mentor applications.",
      );

      if (showLoading) {
        setLoading(false);
      }

      return [];
    }

    const nextApplications =
      data ?? [];

    setApplications(
      nextApplications,
    );

    if (
      nextApplications.length > 0
    ) {
      setSelectedApplicationId(
        (
          currentSelectedId,
        ) => {
          const stillExists =
            nextApplications.some(
              (application) =>
                application.id ===
                currentSelectedId,
            );

          return stillExists
            ? currentSelectedId
            : nextApplications[0].id;
        },
      );
    } else {
      setSelectedApplicationId(
        null,
      );
    }

    if (showLoading) {
      setLoading(false);
    }

    return nextApplications;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      if (!profile?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: applicationError,
      } = await supabase
        .from(
          "mentor_applications",
        )
        .select("*")
        .eq(
          "applicant_user_id",
          profile.id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (!isMounted) {
        return;
      }

      if (applicationError) {
        console.error(
          "Unable to load mentor applications:",
          applicationError,
        );

        setError(
          "We could not load your mentor applications.",
        );

        setLoading(false);
        return;
      }

      const nextApplications =
        data ?? [];

      setApplications(
        nextApplications,
      );

      if (
        nextApplications.length > 0
      ) {
        setSelectedApplicationId(
          nextApplications[0].id,
        );
      }

      setLoading(false);
    }

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeout =
      window.setTimeout(() => {
        setSuccess("");
      }, 5000);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [success]);

  useEffect(() => {
    if (
      !profile?.id ||
      applications.length === 0
    ) {
      return;
    }

    const newestApplication =
      applications[0];

    const approvedOnThisAccount =
      newestApplication.status ===
        "approved" &&
      newestApplication
        .mentor_account_id ===
        profile.id;

    if (!approvedOnThisAccount) {
      return;
    }

    let isMounted = true;

    async function continueToMentorPlatform() {
      await refreshProfile();

      if (!isMounted) {
        return;
      }

      navigate(
        "/mentor/dashboard",
        {
          replace: true,
        },
      );
    }

    continueToMentorPlatform();

    return () => {
      isMounted = false;
    };
  }, [
    applications,
    navigate,
    profile?.id,
    refreshProfile,
  ]);

  const latestApplication =
    applications[0] ?? null;

  const selectedApplication =
    useMemo(
      () =>
        applications.find(
          (application) =>
            application.id ===
            selectedApplicationId,
        ) ??
        latestApplication ??
        null,
      [
        applications,
        latestApplication,
        selectedApplicationId,
      ],
    );

  const selectedIsLatest =
    Boolean(
      selectedApplication &&
        latestApplication &&
        selectedApplication.id ===
          latestApplication.id,
    );

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
    setSuccess("");
    setAccountActionError("");
  }

  function toggleTextOption(
    field,
    option,
  ) {
    setForm((current) => {
      const currentOptions =
        current[field];

      const isSelected =
        currentOptions.includes(
          option,
        );

      return {
        ...current,
        [field]: isSelected
          ? currentOptions.filter(
              (item) =>
                item !== option,
            )
          : [
              ...currentOptions,
              option,
            ],
      };
    });

    setError("");
    setSuccess("");
    setAccountActionError("");
  }

  function toggleNumberOption(
    field,
    option,
  ) {
    setForm((current) => {
      const currentOptions =
        current[field];

      const isSelected =
        currentOptions.includes(
          option,
        );

      return {
        ...current,
        [field]: isSelected
          ? currentOptions.filter(
              (item) =>
                item !== option,
            )
          : [
              ...currentOptions,
              option,
            ].sort(
              (
                first,
                second,
              ) =>
                first -
                second,
            ),
      };
    });

    setError("");
    setSuccess("");
    setAccountActionError("");
  }

  function startEditing() {
    if (
      !selectedApplication ||
      !selectedIsLatest ||
      selectedApplication.status !==
        "pending"
    ) {
      return;
    }

    setForm(
      normaliseApplicationForm(
        selectedApplication,
      ),
    );

    setEditing(true);
    setReapplying(false);
    setError("");
    setSuccess("");
    setAccountActionError("");
  }

  function startReapplication() {
    if (
      !latestApplication ||
      latestApplication.status !==
        "rejected"
    ) {
      return;
    }

    setSelectedApplicationId(
      latestApplication.id,
    );

    setForm(
      normaliseApplicationForm(
        latestApplication,
      ),
    );

    setEditing(true);
    setReapplying(true);
    setError("");
    setSuccess("");
    setAccountActionError("");
  }

  function cancelEditing() {
    setEditing(false);
    setReapplying(false);
    setError("");
    setAccountActionError("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const expertise =
      convertTextToArray(
        form.expertise,
      );

    const categories =
      convertTextToArray(
        form.mentorshipCategories,
      );

    const languages =
      convertTextToArray(
        form.languages,
      );

    if (
      form.biography.trim()
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

    if (
      expertise.length === 0
    ) {
      setError(
        "Please provide at least one area of expertise.",
      );
      return;
    }

    if (
      categories.length === 0
    ) {
      setError(
        "Please provide at least one mentorship category.",
      );
      return;
    }

    if (
      languages.length === 0
    ) {
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

    if (
      form.sessionLengths.length ===
      0
    ) {
      setError(
        "Please select at least one session length.",
      );
      return;
    }

    setSubmitting(true);

    const {
      error: submissionError,
    } = await supabase.rpc(
      "save_mentor_application",
      {
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
          categories,

        p_languages:
          languages,

        p_meeting_formats:
          form.meetingFormats,

        p_session_lengths:
          form.sessionLengths,

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
        "Unable to save mentor application:",
        submissionError,
      );

      setError(
        submissionError.message ||
          "We could not save your mentor application.",
      );

      setSubmitting(false);
      return;
    }

    const wasReapplying =
      reapplying;

    const refreshedApplications =
      await fetchApplications();

    setSubmitting(false);
    setEditing(false);
    setReapplying(false);

    if (
      refreshedApplications.length >
      0
    ) {
      setSelectedApplicationId(
        refreshedApplications[0].id,
      );
    }

    setSuccess(
      wasReapplying
        ? "Your new mentor application has been submitted for review."
        : "Your changes have been saved. Your application is still under review.",
    );
  }

  async function handleCreateMentorAccount() {
    if (
      !latestApplication ||
      latestApplication.status !==
        "approved" ||
      latestApplication.mentor_account_id
    ) {
      return;
    }

    setCreatingMentorAccount(
      true,
    );

    setAccountActionError("");
    setError("");
    setSuccess("");

    const {
      data,
      error:
        invitationError,
    } = await supabase.rpc(
      "create_mentor_account_invitation",
    );

    if (invitationError) {
      console.error(
        "Unable to create mentor account invitation:",
        invitationError,
      );

      setAccountActionError(
        invitationError.message ||
          "We could not prepare your mentor account. Please try again.",
      );

      setCreatingMentorAccount(
        false,
      );

      return;
    }

    const invitation =
      Array.isArray(data)
        ? data[0]
        : data;

    const invitationToken =
      invitation?.invitation_token;

    if (!invitationToken) {
      setAccountActionError(
        "We could not prepare your mentor account invitation. Please try again.",
      );

      setCreatingMentorAccount(
        false,
      );

      return;
    }

    const {
      error: signOutError,
    } = await signOut();

    if (signOutError) {
      console.error(
        "Unable to sign out of mentee account:",
        signOutError,
      );

      setAccountActionError(
        "Your mentor invitation was created, but we could not sign you out of your mentee account. Please try again.",
      );

      setCreatingMentorAccount(
        false,
      );

      return;
    }

    navigate(
      `/mentor/register?invite=${encodeURIComponent(
        invitationToken,
      )}`,
      {
        replace: true,
      },
    );
  }

  function viewApplication(
    application,
  ) {
    setSelectedApplicationId(
      application.id,
    );

    setEditing(false);
    setReapplying(false);
    setError("");
    setSuccess("");
    setAccountActionError("");
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Mentor application"
        description="Track and manage your mentor application."
      >
        <div className="mentor-status-dashboard-center">
          <section className="mentor-status-loading">
            <div className="loader" />

            <p>
              Loading your mentor
              application...
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (
    applications.length === 0
  ) {
    return (
      <DashboardLayout
        title="Mentor application"
        description="Track and manage your mentor application."
      >
        <div className="mentor-status-dashboard-center">
          <section className="mentor-application-status mentor-status-empty">
            <span className="eyebrow">
              MENTOR APPLICATION
            </span>

            <h2>
              You have not submitted
              a mentor application
              yet.
            </h2>

            <p className="mentor-status-description">
              Complete the mentor
              application when you
              are ready to share your
              experience with other
              members.
            </p>

            <button
              type="button"
              className="mentor-status-primary-button mentor-status-empty-button"
              onClick={() =>
                navigate(
                  "/mentee/become-a-mentor",
                )
              }
            >
              Start application
            </button>

            {error && (
              <p
                className="form-error mentor-status-form-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mentor application"
      description="Track and manage your mentor application."
    >
      <div
        className={`mentor-status-page ${
          editing
            ? "mentor-status-page--editing"
            : ""
        }`}
      >
        {editing ? (
          <ApplicationForm
            form={form}
            updateForm={
              updateForm
            }
            toggleTextOption={
              toggleTextOption
            }
            toggleNumberOption={
              toggleNumberOption
            }
            handleSubmit={
              handleSubmit
            }
            submitting={
              submitting
            }
            error={error}
            reapplying={
              reapplying
            }
            cancelEditing={
              cancelEditing
            }
          />
        ) : (
          <>
            <ApplicationStatus
              application={
                selectedApplication
              }
              fullName={
                profile?.full_name
              }
              success={
                success
              }
              selectedIsLatest={
                selectedIsLatest
              }
              onEdit={
                startEditing
              }
              onReapply={
                startReapplication
              }
              onCreateMentorAccount={
                handleCreateMentorAccount
              }
              creatingMentorAccount={
                creatingMentorAccount
              }
              accountActionError={
                accountActionError
              }
            />

            <ApplicationHistory
              applications={
                applications
              }
              selectedApplicationId={
                selectedApplication
                  ?.id
              }
              onView={
                viewApplication
              }
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ApplicationForm({
  form,
  updateForm,
  toggleTextOption,
  toggleNumberOption,
  handleSubmit,
  submitting,
  error,
  reapplying,
  cancelEditing,
}) {
  return (
    <div className="mentor-application-content">
      <span className="eyebrow">
        {reapplying
          ? "NEW MENTOR APPLICATION"
          : "UPDATE APPLICATION"}
      </span>

      <h1>
        {reapplying
          ? "Apply to become a mentor again"
          : "Update your mentor application"}
      </h1>

      <p className="mentor-application-introduction">
        {reapplying
          ? "Your previous application will remain in your history. Review the information below, make any needed changes and submit a new application."
          : "You can update your application while it is still under review."}
      </p>

      <form
        className="mentor-status-edit-form"
        onSubmit={
          handleSubmit
        }
      >
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
            placeholder="For example, Product Designer"
            disabled={
              submitting
            }
            required
          />
        </label>

        <label>
          Organisation
          <span className="optional-label">
            Optional
          </span>

          <input
            type="text"
            name="organisation"
            value={
              form.organisation
            }
            onChange={
              updateForm
            }
            placeholder="Where do you currently work?"
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
          Biography

          <textarea
            name="biography"
            value={
              form.biography
            }
            onChange={
              updateForm
            }
            rows="5"
            minLength="50"
            placeholder="Briefly introduce yourself and your experience."
            disabled={
              submitting
            }
            required
          />

          <small className="field-help">
            {
              form.biography
                .trim()
                .length
            }
            /50 minimum
            characters
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

          <small className="field-help">
            Separate each area with
            a comma.
          </small>
        </label>

        <label>
          Mentorship categories

          <input
            type="text"
            name="mentorshipCategories"
            value={
              form.mentorshipCategories
            }
            onChange={
              updateForm
            }
            placeholder="Career development, leadership, technology"
            disabled={
              submitting
            }
            required
          />

          <small className="field-help">
            Separate each category
            with a comma.
          </small>
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

          <small className="field-help">
            Separate multiple
            languages with a comma.
          </small>
        </label>

        <fieldset className="mentor-status-option-group">
          <legend>
            Meeting format
          </legend>

          <div className="mentor-status-option-grid">
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
                      toggleTextOption(
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

        <fieldset className="mentor-status-option-group">
          <legend>
            Preferred session length
          </legend>

          <div className="mentor-status-option-grid">
            {sessionLengthOptions.map(
              (length) => (
                <label
                  key={
                    length
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      form.sessionLengths.includes(
                        length,
                      )
                    }
                    onChange={() =>
                      toggleNumberOption(
                        "sessionLengths",
                        length,
                      )
                    }
                    disabled={
                      submitting
                    }
                  />

                  <span>
                    {length} minutes
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <label>
          Maximum active mentees

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
            required
          >
            {[
              1,
              2,
              3,
              4,
              5,
              6,
              8,
              10,
            ].map(
              (number) => (
                <option
                  key={
                    number
                  }
                  value={
                    number
                  }
                >
                  {number}{" "}
                  {number === 1
                    ? "mentee"
                    : "mentees"}
                </option>
              ),
            )}
          </select>
        </label>

        {error && (
          <p
            className="form-error mentor-status-form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mentor-status-form-actions">
          <button
            type="button"
            className="mentor-status-secondary-button"
            onClick={
              cancelEditing
            }
            disabled={
              submitting
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mentor-status-primary-button"
            disabled={
              submitting
            }
          >
            <Send size={16} />

            <span>
              {submitting
                ? reapplying
                  ? "Submitting..."
                  : "Saving..."
                : reapplying
                  ? "Submit new application"
                  : "Save changes"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ApplicationStatus({
  application,
  fullName,
  success,
  selectedIsLatest,
  onEdit,
  onReapply,
  onCreateMentorAccount,
  creatingMentorAccount,
  accountActionError,
}) {
  const statusInformation = {
    pending: {
      label:
        "UNDER REVIEW",

      heading:
        "Your mentor application is under review.",

      description:
        "The TCN Ikeja administration team is reviewing this application. You will see the decision here when the review is complete.",

      note:
        "You can update the latest application while it is still under review.",
    },

    approved: {
      label:
        "APPROVED",

      heading:
        "Your mentor application has been approved.",

      description:
        "Your mentee account remains unchanged. The next step is to create a separate mentor account with a different email address.",

      note:
        "Your approved application remains saved in your application history.",
    },

    rejected: {
      label:
        "REJECTED",

      heading:
        "Your mentor application was not approved.",

      description:
        "Review the administrator’s feedback below. If you want to try again, you can submit a new application without losing this one.",

      note:
        "A new application will be saved as a separate attempt in your history.",
    },
  };

  const status =
    application?.status ??
    "pending";

  const information =
    statusInformation[
      status
    ] ??
    statusInformation.pending;

  const expertise =
    application?.expertise ??
    [];

  const categories =
    application
      ?.mentorship_categories ??
    [];

  const mentoringAreas =
    expertise.length > 0
      ? expertise
      : categories;

  return (
    <section className="mentor-application-status">
      <div className="mentor-status-top-row">
        <span
          className={`mentor-status-badge mentor-status-badge--${status}`}
        >
          {
            information.label
          }
        </span>

        <div className="mentor-status-top-actions">
          {selectedIsLatest &&
            status ===
              "pending" && (
              <button
                type="button"
                className="mentor-status-edit-button"
                onClick={
                  onEdit
                }
              >
                <Pencil
                  size={15}
                />

                <span>
                  Update application
                </span>
              </button>
            )}

          {selectedIsLatest &&
            status ===
              "rejected" && (
              <button
                type="button"
                className="mentor-status-reapply-button"
                onClick={
                  onReapply
                }
              >
                <RotateCcw
                  size={15}
                />

                <span>
                  Apply again
                </span>
              </button>
            )}
        </div>
      </div>

      <h2>
        {information.heading}
      </h2>

      <p className="mentor-status-description">
        {
          information.description
        }
      </p>

      {fullName && (
        <p className="mentor-status-name">
          Application for{" "}
          <strong>
            {fullName}
          </strong>
        </p>
      )}

      <div className="mentor-status-meta-row">
        <span>
          Submitted{" "}
          {formatDate(
            application
              ?.created_at,
          )}
        </span>

        {application
          ?.reviewed_at && (
          <span>
            Reviewed{" "}
            {formatDate(
              application
                .reviewed_at,
            )}
          </span>
        )}
      </div>

      {mentoringAreas.length >
        0 && (
        <div className="mentor-status-areas">
          <span>
            MENTORING AREAS
          </span>

          <div>
            {mentoringAreas.map(
              (area) => (
                <small
                  key={
                    area
                  }
                >
                  {area}
                </small>
              ),
            )}
          </div>
        </div>
      )}

      {selectedIsLatest &&
        status ===
          "approved" && (
        <div className="mentor-status-approved-action">
          {application
            ?.mentor_account_id ? (
            <div className="mentor-status-account-created">
              <CheckCircle2
                size={18}
                strokeWidth={1.9}
              />

              <div>
                <strong>
                  Mentor account created
                </strong>

                <p>
                  This approved
                  application has
                  already been linked
                  to a mentor account.
                  Sign in with your
                  mentor account email
                  to continue.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mentor-status-approved-copy">
                <strong>
                  Ready for the next
                  step
                </strong>

                <p>
                  Create your separate
                  mentor account using
                  a different email
                  address. You will
                  keep this mentee
                  account exactly as
                  it is.
                </p>
              </div>

              <button
                type="button"
                className="mentor-status-create-account-button"
                onClick={
                  onCreateMentorAccount
                }
                disabled={
                  creatingMentorAccount
                }
              >
                <UserPlus
                  size={16}
                />

                <span>
                  {creatingMentorAccount
                    ? "Preparing mentor account..."
                    : "Create mentor account"}
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {accountActionError && (
        <p
          className="mentor-status-account-error"
          role="alert"
        >
          {accountActionError}
        </p>
      )}

      {application
        ?.admin_feedback && (
        <div className="application-feedback">
          <strong>
            Administrator’s
            feedback
          </strong>

          <p>
            {
              application
                .admin_feedback
            }
          </p>
        </div>
      )}

      {success && (
        <p className="mentor-status-success-message">
          {success}
        </p>
      )}

      <footer className="mentor-status-footer">
        <p>
          {information.note}
        </p>
      </footer>
    </section>
  );
}

function ApplicationHistory({
  applications,
  selectedApplicationId,
  onView,
}) {
  return (
    <section className="mentor-application-history">
      <div className="mentor-history-heading">
        <span className="mentor-history-icon">
          <History
            size={18}
          />
        </span>

        <div>
          <h3>
            Application history
          </h3>

          <p>
            Every application attempt
            stays here, including
            rejected and approved
            applications.
          </p>
        </div>
      </div>

      <div className="mentor-history-list">
        {applications.map(
          (
            application,
            index,
          ) => {
            const attemptNumber =
              applications.length -
              index;

            const isSelected =
              application.id ===
              selectedApplicationId;

            return (
              <button
                key={
                  application.id
                }
                type="button"
                className={`mentor-history-item ${
                  isSelected
                    ? "mentor-history-item--active"
                    : ""
                }`}
                onClick={() =>
                  onView(
                    application,
                  )
                }
              >
                <span className="mentor-history-item-main">
                  <strong>
                    Application{" "}
                    {
                      attemptNumber
                    }
                  </strong>

                  <small>
                    {formatDate(
                      application.created_at,
                    )}
                  </small>
                </span>

                <span
                  className={`mentor-history-status mentor-history-status--${application.status}`}
                >
                  {
                    application.status
                  }
                </span>
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

export default MentorApplicationStatus;
