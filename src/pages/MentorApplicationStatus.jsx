import { useEffect, useState } from "react";

import {
  CheckCircle2,
  Clock3,
  HeartHandshake,
  LogOut,
  Pencil,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const initialForm = {
  biography: "",
  jobTitle: "",
  organisation: "",
  expertise: "",
  mentorshipCategories: "",
  languages: "English",
  meetingFormat: "Virtual",
  sessionLength: "60",
  maximumActiveMentees: "5",
  yearsOfExperience: "",
};

function convertTextToArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function MentorApplicationStatus() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadApplication() {
      const { data, error: applicationError } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("mentor_id", profile.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (applicationError) {
        console.error(applicationError);
        setError("We could not load your mentor application.");
        setLoading(false);
        return;
      }

      if (data) {
        setApplication(data);

        setForm({
          biography: data.biography ?? "",
          jobTitle: data.job_title ?? "",
          organisation: data.organisation ?? "",
          expertise: (data.expertise ?? []).join(", "),
          mentorshipCategories:
            (data.mentorship_categories ?? []).join(", "),
          languages: (data.languages ?? ["English"]).join(", "),
          meetingFormat:
            data.meeting_formats?.[0] ?? "Virtual",
          sessionLength:
            String(data.session_lengths?.[0] ?? 60),
          maximumActiveMentees:
            String(data.maximum_active_mentees ?? 5),
          yearsOfExperience:
            data.years_of_experience === null
              ? ""
              : String(data.years_of_experience),
        });
      }

      setLoading(false);
    }

    if (profile?.id) {
      loadApplication();
    }

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const expertise = convertTextToArray(form.expertise);
    const categories = convertTextToArray(
      form.mentorshipCategories,
    );
    const languages = convertTextToArray(form.languages);

    if (form.biography.trim().length < 40) {
      setError(
        "Please write at least 40 characters in your biography.",
      );
      return;
    }

    if (expertise.length === 0) {
      setError("Please provide at least one area of expertise.");
      return;
    }

    if (categories.length === 0) {
      setError(
        "Please provide at least one mentorship category.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const { data, error: submissionError } =
      await supabase.rpc("submit_mentor_application", {
        p_biography: form.biography.trim(),
        p_job_title: form.jobTitle.trim(),
        p_organisation: form.organisation.trim(),
        p_expertise: expertise,
        p_mentorship_categories: categories,
        p_languages:
          languages.length > 0 ? languages : ["English"],
        p_meeting_formats: [form.meetingFormat],
        p_session_lengths: [
          Number(form.sessionLength),
        ],
        p_maximum_active_mentees:
          Number(form.maximumActiveMentees),
        p_years_of_experience:
          form.yearsOfExperience === ""
            ? null
            : Number(form.yearsOfExperience),
      });

    setSubmitting(false);

    if (submissionError) {
      console.error(submissionError);
      setError(
        submissionError.message ||
          "We could not submit your application.",
      );
      return;
    }

    setApplication(data);
    setEditing(false);
    setSuccess(
      "Your mentor application has been submitted successfully.",
    );
  }

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  if (loading) {
    return (
      <main className="page-message">
        <div className="loader" />
        <p>Loading your mentor application...</p>
      </main>
    );
  }

  const shouldShowForm = !application || editing;

  return (
    <main className="mentor-application-page">
      <section className="mentor-application-panel">
        <div className="mentor-application-brand">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <HeartHandshake size={22} />
            </span>

            <span className="mentor-application-brand-text">
              <strong>Mentor Connect</strong>
              <small>TCN IKEJA</small>
            </span>
          </Link>

          <button
            type="button"
            className="mentor-sign-out"
            onClick={handleSignOut}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>

        {shouldShowForm ? (
          <ApplicationForm
            form={form}
            updateForm={updateForm}
            handleSubmit={handleSubmit}
            submitting={submitting}
            error={error}
            application={application}
            cancelEditing={() => {
              setEditing(false);
              setError("");
            }}
          />
        ) : (
          <ApplicationStatus
            application={application}
            fullName={profile?.full_name}
            success={success}
            onEdit={() => setEditing(true)}
          />
        )}
      </section>

      <aside className="mentor-application-message">
        <ShieldCheck size={40} />

        <span className="eyebrow">MENTOR WITH PURPOSE</span>

        <h2>
          Share your experience. Help someone move forward.
        </h2>

        <p>
          Every mentor profile is reviewed before it appears in
          the community directory.
        </p>
      </aside>
    </main>
  );
}

function ApplicationForm({
  form,
  updateForm,
  handleSubmit,
  submitting,
  error,
  application,
  cancelEditing,
}) {
  return (
    <div className="mentor-application-content">
      <span className="eyebrow">
        {application
          ? "UPDATE YOUR APPLICATION"
          : "BECOME A MENTOR"}
      </span>

      <h1>
        {application
          ? "Update your mentor profile"
          : "Complete your mentor application"}
      </h1>

      <p className="mentor-application-introduction">
        Tell us about your experience and the areas where you
        would like to guide others.
      </p>

      <form
        className="mentor-application-form"
        onSubmit={handleSubmit}
      >
        <label>
          Job title

          <input
            type="text"
            name="jobTitle"
            value={form.jobTitle}
            onChange={updateForm}
            placeholder="For example, Product Designer"
            required
          />
        </label>

        <label>
          Organisation
          <span className="optional-label">Optional</span>

          <input
            type="text"
            name="organisation"
            value={form.organisation}
            onChange={updateForm}
            placeholder="Where do you currently work?"
          />
        </label>

        <label>
          Years of experience

          <input
            type="number"
            name="yearsOfExperience"
            value={form.yearsOfExperience}
            onChange={updateForm}
            min="0"
            max="60"
            placeholder="For example, 5"
            required
          />
        </label>

        <label>
          Biography

          <textarea
            name="biography"
            value={form.biography}
            onChange={updateForm}
            rows="4"
            minLength="40"
            placeholder="Briefly introduce yourself and your experience."
            required
          />
        </label>

        <label>
          Areas of expertise

          <input
            type="text"
            name="expertise"
            value={form.expertise}
            onChange={updateForm}
            placeholder="Product design, leadership, career growth"
            required
          />

          <small className="field-help">
            Separate each area with a comma.
          </small>
        </label>

        <label>
          Mentorship categories

          <input
            type="text"
            name="mentorshipCategories"
            value={form.mentorshipCategories}
            onChange={updateForm}
            placeholder="Career, business, faith, personal growth"
            required
          />

          <small className="field-help">
            Separate each category with a comma.
          </small>
        </label>

        <label>
          Languages

          <input
            type="text"
            name="languages"
            value={form.languages}
            onChange={updateForm}
            placeholder="English"
            required
          />

          <small className="field-help">
            Separate multiple languages with a comma.
          </small>
        </label>

        <label>
          Preferred meeting format

          <select
            name="meetingFormat"
            value={form.meetingFormat}
            onChange={updateForm}
          >
            <option value="Virtual">Virtual</option>
            <option value="In person">In person</option>
            <option value="Either">Either</option>
          </select>
        </label>

        <label>
          Preferred session length

          <select
            name="sessionLength"
            value={form.sessionLength}
            onChange={updateForm}
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </label>

        <label>
          Maximum active mentees

          <select
            name="maximumActiveMentees"
            value={form.maximumActiveMentees}
            onChange={updateForm}
          >
            <option value="1">1 mentee</option>
            <option value="2">2 mentees</option>
            <option value="3">3 mentees</option>
            <option value="4">4 mentees</option>
            <option value="5">5 mentees</option>
            <option value="6">6 mentees</option>
            <option value="8">8 mentees</option>
            <option value="10">10 mentees</option>
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="mentor-application-actions">
          {application && (
            <button
              type="button"
              className="secondary-button"
              onClick={cancelEditing}
              disabled={submitting}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            <Send size={17} />

            {submitting
              ? "Submitting..."
              : application
                ? "Save application"
                : "Submit application"}
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
  onEdit,
}) {
  const statusInformation = {
    pending: {
      icon: <Clock3 size={38} />,
      eyebrow: "APPLICATION UNDER REVIEW",
      heading: `Thank you, ${fullName || "mentor"}`,
      description:
        "Your mentor application is being reviewed by the administration team.",
    },

    approved: {
      icon: <CheckCircle2 size={38} />,
      eyebrow: "APPLICATION APPROVED",
      heading: "Your mentor profile has been approved",
      description:
        "Your profile can now appear in the mentor directory when you are accepting requests.",
    },

    declined: {
      icon: <XCircle size={38} />,
      eyebrow: "APPLICATION NEEDS CHANGES",
      heading: "Your application was not approved",
      description:
        "Review the administrator’s feedback, update your information and submit again.",
    },

    suspended: {
      icon: <ShieldCheck size={38} />,
      eyebrow: "APPLICATION SUSPENDED",
      heading: "Your mentor profile is currently unavailable",
      description:
        "Please contact the administration team for more information.",
    },
  };

  const information =
    statusInformation[application.approval_status] ??
    statusInformation.pending;

  return (
    <div className="mentor-application-status">
      <span className="status-icon">
        {information.icon}
      </span>

      <span className="eyebrow">
        {information.eyebrow}
      </span>

      <h1>{information.heading}</h1>

      <p>{information.description}</p>

      {application.mentor_response && (
        <div className="application-feedback">
          <strong>Administrator’s feedback</strong>
          <p>{application.mentor_response}</p>
        </div>
      )}

      {success && (
        <p className="application-success">{success}</p>
      )}

      {application.approval_status !== "suspended" && (
        <button
          type="button"
          className="secondary-button"
          onClick={onEdit}
        >
          <Pencil size={16} />
          Edit application
        </button>
      )}
    </div>
  );
}

export default MentorApplicationStatus;