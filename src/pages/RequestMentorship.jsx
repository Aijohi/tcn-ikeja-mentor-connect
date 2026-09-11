import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Target,
  UserRoundCheck,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const initialForm = {
  mentoringArea: "",
  goalStatement: "",
  reasonForChoosingMentor: "",
  preferredTimes: "",
};

function RequestMentorship() {
  const { mentorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mentor, setMentor] = useState(null);
  const [menteeProfile, setMenteeProfile] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const [
        mentorResult,
        menteeProfileResult,
        existingRequestResult,
      ] = await Promise.all([
        supabase
          .from("mentor_profiles")
          .select(`
            mentor_id,
            job_title,
            organisation,
            mentorship_categories,
            maximum_active_mentees,
            current_active_mentees,
            accepting_requests,
            approval_status,
            profiles!mentor_profiles_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("mentor_id", mentorId)
          .eq("approval_status", "approved")
          .maybeSingle(),

        supabase
          .from("mentee_profiles")
          .select(`
            biography,
            mentorship_areas,
            development_goals,
            hopes_to_gain,
            conduct_agreed,
            safety_agreed
          `)
          .eq("mentee_id", user.id)
          .maybeSingle(),

        supabase
          .from("mentorship_requests")
          .select(`
            id,
            mentoring_area,
            goal_statement,
            status,
            created_at
          `)
          .eq("mentee_id", user.id)
          .eq("mentor_id", mentorId)
          .in("status", [
            "pending",
            "accepted",
            "clarification_requested",
          ])
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        mentorResult.error ||
        menteeProfileResult.error ||
        existingRequestResult.error;

      if (firstError) {
        console.error(
          "Unable to prepare mentorship request:",
          firstError.message,
        );

        setError(
          "We could not prepare this mentorship request. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!mentorResult.data) {
        setError(
          "This mentor profile is no longer available.",
        );

        setLoading(false);
        return;
      }

      setMentor(mentorResult.data);
      setMenteeProfile(menteeProfileResult.data ?? null);
      setExistingRequest(
        existingRequestResult.data ?? null,
      );

      const firstMentorshipArea =
        menteeProfileResult.data
          ?.mentorship_areas?.[0] ?? "";

      setForm((current) => ({
        ...current,
        mentoringArea:
          current.mentoringArea ||
          firstMentorshipArea,
      }));

      setLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [mentorId, user?.id]);

  const profileComplete = useMemo(() => {
    if (!menteeProfile) {
      return false;
    }

    return Boolean(
      menteeProfile.biography?.trim() &&
        menteeProfile.mentorship_areas?.length > 0 &&
        menteeProfile.development_goals?.trim() &&
        menteeProfile.hopes_to_gain?.trim() &&
        menteeProfile.conduct_agreed &&
        menteeProfile.safety_agreed,
    );
  }, [menteeProfile]);

  const availableSpaces = mentor
    ? Math.max(
        (mentor.maximum_active_mentees ?? 0) -
          (mentor.current_active_mentees ?? 0),
        0,
      )
    : 0;

  const mentorUnavailable =
    !mentor?.accepting_requests ||
    availableSpaces <= 0;

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!profileComplete) {
      setError(
        "Please complete your mentee profile before requesting mentorship.",
      );
      return;
    }

    if (!form.mentoringArea) {
      setError("Please select a mentoring area.");
      return;
    }

    if (!form.goalStatement.trim()) {
      setError("Please add a short goal statement.");
      return;
    }

    if (!form.reasonForChoosingMentor.trim()) {
      setError(
        "Please explain why you chose this mentor.",
      );
      return;
    }

    setSubmitting(true);

    const { error: requestError } = await supabase.rpc(
      "submit_mentorship_request",
      {
        p_mentor_id: mentorId,
        p_mentoring_area: form.mentoringArea,
        p_goal_statement: form.goalStatement.trim(),
        p_reason_for_choosing_mentor:
          form.reasonForChoosingMentor.trim(),
        p_preferred_times:
          form.preferredTimes.trim(),
      },
    );

    setSubmitting(false);

    if (requestError) {
      console.error(
        "Unable to send mentorship request:",
        requestError.message,
      );

      setError(
        requestError.message ||
          "We could not send your mentorship request.",
      );

      return;
    }

    setSuccess(true);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Request mentorship"
        description="Tell this mentor what support you are looking for."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>Preparing your request</h2>

          <p>
            Please wait while we prepare the mentorship
            request form.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (!mentor) {
    return (
      <DashboardLayout
        title="Request mentorship"
        description="Tell this mentor what support you are looking for."
      >
        <section className="dashboard-empty-state">
          <h2>Mentor unavailable</h2>

          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/mentee/find-mentor")
            }
          >
            Back to mentors
          </button>
        </section>
      </DashboardLayout>
    );
  }

  const mentorName =
    mentor.profiles?.full_name || "this mentor";

  if (success) {
    return (
      <DashboardLayout
        title="Request mentorship"
        description="Your request has been sent."
      >
        <section className="mentorship-request-success">
          <span className="mentorship-request-success-icon">
            <CheckCircle2 size={28} />
          </span>

          <span className="eyebrow">
            REQUEST SENT
          </span>

          <h2>
            Your mentorship request has been sent to{" "}
            {mentorName}.
          </h2>

          <p>
            The mentor can now review your profile and request.
            You will be able to see the response once they take
            action.
          </p>

          <div className="mentorship-request-success-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/mentee/find-mentor")
              }
            >
              Browse mentors
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate("/mentee/dashboard")
              }
            >
              Go to dashboard
            </button>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request mentorship"
      description={`Tell ${mentorName} what support you are looking for.`}
    >
      <div className="mentorship-request-page">
        <button
          type="button"
          className="mentor-profile-back"
          onClick={() =>
            navigate(
              `/mentee/mentors/${mentorId}`,
            )
          }
        >
          <ArrowLeft size={16} />
          Back to mentor profile
        </button>

        <section className="mentorship-request-mentor">
          <div>
            <span className="eyebrow">
              REQUESTING MENTOR
            </span>

            <h2>{mentorName}</h2>

            <p>
              {mentor.job_title || "Mentor"}
              {mentor.organisation
                ? ` at ${mentor.organisation}`
                : ""}
            </p>
          </div>

          <span
            className={`mentorship-request-capacity ${
              mentorUnavailable
                ? "unavailable"
                : ""
            }`}
          >
            {mentorUnavailable
              ? "Not accepting requests"
              : `${availableSpaces} ${
                  availableSpaces === 1
                    ? "space"
                    : "spaces"
                } available`}
          </span>
        </section>

        {!profileComplete && (
          <section className="mentorship-profile-required">
            <span>
              <UserRoundCheck size={22} />
            </span>

            <div>
              <h3>
                Complete your mentee profile first
              </h3>

              <p>
                Your mentor needs your profile to understand
                your goals before deciding whether to accept
                the request.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  navigate("/mentee/profile")
                }
              >
                Complete my profile
              </button>
            </div>
          </section>
        )}

        {existingRequest && (
          <section className="mentorship-existing-request">
            <HeartHandshake size={22} />

            <div>
              <h3>
                You already have a request with this mentor
              </h3>

              <p>
                Current status:{" "}
                <strong>
                  {String(
                    existingRequest.status,
                  ).replaceAll("_", " ")}
                </strong>
              </p>
            </div>
          </section>
        )}

        {error && (
          <p className="form-error">{error}</p>
        )}

        <form
          className="mentorship-request-form"
          onSubmit={handleSubmit}
        >
          <section className="mentorship-request-section">
            <div className="mentorship-request-section-heading">
              <Target size={20} />

              <div>
                <h3>Your mentoring goal</h3>

                <p>
                  Be specific enough for the mentor to decide
                  whether they are the right person to help.
                </p>
              </div>
            </div>

            <label className="mentorship-request-field">
              Desired mentoring area

              <select
                name="mentoringArea"
                value={form.mentoringArea}
                onChange={updateForm}
                disabled={
                  submitting ||
                  !profileComplete ||
                  mentorUnavailable ||
                  Boolean(existingRequest)
                }
                required
              >
                <option value="">
                  Select an area
                </option>

                {(menteeProfile?.mentorship_areas ?? [])
                  .map((area) => (
                    <option
                      key={area}
                      value={area}
                    >
                      {area}
                    </option>
                  ))}
              </select>
            </label>

            <label className="mentorship-request-field">
              Short goal statement

              <textarea
                name="goalStatement"
                value={form.goalStatement}
                onChange={updateForm}
                placeholder="What would you like to make progress on with this mentor?"
                disabled={
                  submitting ||
                  !profileComplete ||
                  mentorUnavailable ||
                  Boolean(existingRequest)
                }
                required
              />
            </label>

            <label className="mentorship-request-field">
              Why did you choose this mentor?

              <textarea
                name="reasonForChoosingMentor"
                value={
                  form.reasonForChoosingMentor
                }
                onChange={updateForm}
                placeholder="Explain what about this mentor's experience or profile feels relevant to your goal."
                disabled={
                  submitting ||
                  !profileComplete ||
                  mentorUnavailable ||
                  Boolean(existingRequest)
                }
                required
              />
            </label>
          </section>

          <section className="mentorship-request-section">
            <div className="mentorship-request-section-heading">
              <Clock3 size={20} />

              <div>
                <h3>Preferred times</h3>

                <p>
                  Optional. Share times that generally work for
                  you. Session scheduling will happen after a
                  request is accepted.
                </p>
              </div>
            </div>

            <label className="mentorship-request-field">
              Preferred times{" "}
              <small>(optional)</small>

              <textarea
                name="preferredTimes"
                value={form.preferredTimes}
                onChange={updateForm}
                placeholder="For example, weekday evenings after 6 PM or Saturday mornings."
                disabled={
                  submitting ||
                  !profileComplete ||
                  mentorUnavailable ||
                  Boolean(existingRequest)
                }
              />
            </label>
          </section>

          <div className="mentorship-request-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/mentors/${mentorId}`,
                )
              }
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={
                submitting ||
                !profileComplete ||
                mentorUnavailable ||
                Boolean(existingRequest)
              }
            >
              {submitting
                ? "Sending request..."
                : "Send mentorship request"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default RequestMentorship;
