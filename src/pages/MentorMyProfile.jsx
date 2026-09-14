import {
  BriefcaseBusiness,
  Check,
  Languages,
  Save,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorMyProfile.css";

const EMPTY_FORM = {
  biography: "",
  jobTitle: "",
  organisation: "",
  expertise: "",
  mentorshipCategories: "",
  languages: "",
  meetingFormats: "",
  sessionLengths: "",
  yearsOfExperience: "",
  maximumActiveMentees: "3",
  acceptingRequests: false,
};

function MentorMyProfile() {
  const { user } = useAuth();

  const [mentorProfile, setMentorProfile] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentorProfile() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: profileError,
      } = await supabase
        .from("mentor_profiles")
        .select(`
          mentor_id,
          biography,
          job_title,
          organisation,
          expertise,
          mentorship_categories,
          languages,
          meeting_formats,
          session_lengths,
          maximum_active_mentees,
          current_active_mentees,
          years_of_experience,
          accepting_requests,
          approval_status
        `)
        .eq(
          "mentor_id",
          user.id,
        )
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "Unable to load mentor profile:",
          profileError.message,
        );

        setError(
          "We could not load your mentor profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "Your mentor profile could not be found. Please contact an administrator.",
        );

        setLoading(false);
        return;
      }

      setMentorProfile(data);

      setForm({
        biography:
          data.biography ?? "",
        jobTitle:
          data.job_title ?? "",
        organisation:
          data.organisation ?? "",
        expertise:
          listToText(
            data.expertise,
          ),
        mentorshipCategories:
          listToText(
            data.mentorship_categories,
          ),
        languages:
          listToText(
            data.languages,
          ),
        meetingFormats:
          listToText(
            data.meeting_formats,
          ),
        sessionLengths:
          (data.session_lengths ?? [])
            .join(", "),
        yearsOfExperience:
          String(
            data.years_of_experience ??
              "",
          ),
        maximumActiveMentees:
          String(
            data.maximum_active_mentees ??
              3,
          ),
        acceptingRequests:
          data.accepting_requests ===
          true,
      });

      setLoading(false);
    }

    loadMentorProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const currentActiveMentees =
    Number(
      mentorProfile?.current_active_mentees ??
        0,
    );

  const maximumActiveMentees =
    Number(
      form.maximumActiveMentees ||
        0,
    );

  const availableSpaces =
    Math.max(
      maximumActiveMentees -
        currentActiveMentees,
      0,
    );

  const canAcceptRequests =
    mentorProfile?.approval_status ===
      "approved" &&
    availableSpaces > 0;

  const availabilityText =
    useMemo(() => {
      if (
        mentorProfile?.approval_status !==
        "approved"
      ) {
        return "Your mentor profile is not approved yet.";
      }

      if (
        form.acceptingRequests &&
        availableSpaces > 0
      ) {
        return `Mentees can currently find you. You have ${availableSpaces} ${
          availableSpaces === 1
            ? "space"
            : "spaces"
        } available.`;
      }

      if (availableSpaces <= 0) {
        return "Your active mentee capacity is currently full.";
      }

      return "Your profile remains active, but new mentees cannot request you while availability is off.";
    }, [
      availableSpaces,
      form.acceptingRequests,
      mentorProfile?.approval_status,
    ]);

  function updateField(
    field,
    value,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      maximumActiveMentees <
      currentActiveMentees
    ) {
      setError(
        `Maximum active mentees cannot be lower than your current active mentees (${currentActiveMentees}).`,
      );
      return;
    }

    if (
      maximumActiveMentees < 1
    ) {
      setError(
        "Maximum active mentees must be at least 1.",
      );
      return;
    }

    const sessionLengths =
      textToNumberList(
        form.sessionLengths,
      );

    if (
      form.sessionLengths.trim() &&
      sessionLengths.length === 0
    ) {
      setError(
        "Session length must contain numbers such as 30, 45 or 60.",
      );
      return;
    }

    setSaving(true);

    const shouldAcceptRequests =
      canAcceptRequests &&
      form.acceptingRequests;

    const {
      data,
      error: saveError,
    } = await supabase
      .from("mentor_profiles")
      .update({
        biography:
          form.biography.trim(),
        job_title:
          form.jobTitle.trim(),
        organisation:
          form.organisation.trim(),
        expertise:
          textToList(
            form.expertise,
          ),
        mentorship_categories:
          textToList(
            form.mentorshipCategories,
          ),
        languages:
          textToList(
            form.languages,
          ),
        meeting_formats:
          textToList(
            form.meetingFormats,
          ),
        session_lengths:
          sessionLengths.length > 0
            ? sessionLengths
            : [45],
        maximum_active_mentees:
          maximumActiveMentees,
        years_of_experience:
          Number(
            form.yearsOfExperience ||
              0,
          ),
        accepting_requests:
          shouldAcceptRequests,
      })
      .eq(
        "mentor_id",
        user.id,
      )
      .select(`
        mentor_id,
        biography,
        job_title,
        organisation,
        expertise,
        mentorship_categories,
        languages,
        meeting_formats,
        session_lengths,
        maximum_active_mentees,
        current_active_mentees,
        years_of_experience,
        accepting_requests,
        approval_status
      `)
      .single();

    if (saveError) {
      console.error(
        "Unable to save mentor profile:",
        saveError.message,
      );

      setError(
        saveError.message ||
          "We could not save your mentor profile.",
      );

      setSaving(false);
      return;
    }

    setMentorProfile(data);

    setForm((current) => ({
      ...current,
      acceptingRequests:
        data.accepting_requests ===
        true,
    }));

    setSuccess(
      "Your mentor profile has been updated.",
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="My profile"
        description="Manage the information mentees see about you."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading your mentor profile
          </h2>

          <p>
            Please wait while we prepare your information.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My profile"
      description="Manage the information mentees see about you."
    >
      <form
        className="mentor-my-profile-page"
        onSubmit={handleSubmit}
      >
        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="mentor-profile-success">
            <Check size={16} />
            {success}
          </p>
        )}

        <section className="mentor-profile-availability-section">
          <div className="mentor-profile-section-copy">
            <span>
              AVAILABILITY
            </span>

            <h2>
              Control when mentees can find you
            </h2>

            <p>
              Turn availability on when you are ready to receive new mentorship requests.
            </p>
          </div>

          <div className="mentor-profile-availability-control">
            <label className="mentor-profile-switch-row">
              <span>
                <strong>
                  Accepting mentorship requests
                </strong>

                <small>
                  {availabilityText}
                </small>
              </span>

              <input
                type="checkbox"
                checked={
                  form.acceptingRequests
                }
                disabled={
                  !canAcceptRequests ||
                  saving
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "acceptingRequests",
                    event.target.checked,
                  )
                }
              />
            </label>

            <div className="mentor-profile-capacity-grid">
              <ProfileMetric
                icon={
                  <Users
                    size={18}
                  />
                }
                label="Current active mentees"
                value={
                  currentActiveMentees
                }
              />

              <ProfileMetric
                icon={
                  <BriefcaseBusiness
                    size={18}
                  />
                }
                label="Available spaces"
                value={
                  availableSpaces
                }
              />
            </div>
          </div>
        </section>

        <section className="mentor-profile-form-section">
          <div className="mentor-profile-section-heading">
            <span>
              PROFILE INFORMATION
            </span>

            <h2>
              About you
            </h2>

            <p>
              This information helps mentees understand your background and mentoring experience.
            </p>
          </div>

          <div className="mentor-profile-form-grid">
            <Field
              label="Job title"
              value={
                form.jobTitle
              }
              placeholder="Product Designer"
              onChange={(
                value,
              ) =>
                updateField(
                  "jobTitle",
                  value,
                )
              }
            />

            <Field
              label="Organisation"
              value={
                form.organisation
              }
              placeholder="Organisation name"
              onChange={(
                value,
              ) =>
                updateField(
                  "organisation",
                  value,
                )
              }
            />

            <Field
              label="Years of experience"
              type="number"
              min="0"
              value={
                form.yearsOfExperience
              }
              placeholder="5"
              onChange={(
                value,
              ) =>
                updateField(
                  "yearsOfExperience",
                  value,
                )
              }
            />

            <Field
              label="Maximum active mentees"
              type="number"
              min="1"
              value={
                form.maximumActiveMentees
              }
              onChange={(
                value,
              ) =>
                updateField(
                  "maximumActiveMentees",
                  value,
                )
              }
            />
          </div>

          <label className="mentor-profile-field mentor-profile-field-full">
            <span>
              Biography
            </span>

            <textarea
              value={
                form.biography
              }
              rows="6"
              placeholder="Tell mentees about your background, experience and mentoring approach."
              onChange={(
                event,
              ) =>
                updateField(
                  "biography",
                  event.target.value,
                )
              }
            />
          </label>
        </section>

        <section className="mentor-profile-form-section">
          <div className="mentor-profile-section-heading">
            <span>
              MENTORING DETAILS
            </span>

            <h2>
              How you can support mentees
            </h2>

            <p>
              Separate multiple items with commas.
            </p>
          </div>

          <div className="mentor-profile-form-grid">
            <Field
              label="Areas of expertise"
              value={
                form.expertise
              }
              placeholder="Product Design, Career Development"
              onChange={(
                value,
              ) =>
                updateField(
                  "expertise",
                  value,
                )
              }
            />

            <Field
              label="Mentorship categories"
              value={
                form.mentorshipCategories
              }
              placeholder="Technology, Leadership"
              onChange={(
                value,
              ) =>
                updateField(
                  "mentorshipCategories",
                  value,
                )
              }
            />

            <Field
              label="Languages"
              icon={
                <Languages
                  size={15}
                />
              }
              value={
                form.languages
              }
              placeholder="English"
              onChange={(
                value,
              ) =>
                updateField(
                  "languages",
                  value,
                )
              }
            />

            <Field
              label="Meeting formats"
              value={
                form.meetingFormats
              }
              placeholder="Virtual, In person"
              onChange={(
                value,
              ) =>
                updateField(
                  "meetingFormats",
                  value,
                )
              }
            />

            <Field
              label="Session lengths in minutes"
              value={
                form.sessionLengths
              }
              placeholder="30, 45, 60"
              onChange={(
                value,
              ) =>
                updateField(
                  "sessionLengths",
                  value,
                )
              }
            />
          </div>
        </section>

        <div className="mentor-profile-save-row">
          <button
            type="submit"
            className="primary-button mentor-profile-save-button"
            disabled={saving}
          >
            <Save
              size={16}
            />

            <span>
              {saving
                ? "Saving..."
                : "Save changes"}
            </span>
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  min,
  icon,
}) {
  return (
    <label className="mentor-profile-field">
      <span>
        {icon}
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        placeholder={
          placeholder
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
      />
    </label>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="mentor-profile-metric">
      <span>
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

function listToText(
  values,
) {
  if (!Array.isArray(values)) {
    return "";
  }

  return values.join(", ");
}

function textToList(
  value,
) {
  return String(value || "")
    .split(",")
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

function textToNumberList(
  value,
) {
  return String(value || "")
    .split(",")
    .map((item) =>
      Number(
        item.trim(),
      ),
    )
    .filter(
      (item) =>
        Number.isFinite(item) &&
        item > 0,
    );
}

export default MentorMyProfile;
