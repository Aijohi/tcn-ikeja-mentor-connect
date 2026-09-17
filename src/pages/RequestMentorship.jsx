import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  UserRoundCheck,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MenteeRequestFlow.css";

const MIN_GOAL_WORDS = 5;
const MIN_REASON_WORDS = 5;

const initialForm = {
  mentoringArea: "",
  goalStatement: "",
  reasonForChoosingMentor: "",
  preferredTimes: "",
};

function countWords(value) {
  const trimmedValue =
    value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function getProfile(row) {
  if (Array.isArray(row?.profiles)) {
    return row.profiles[0] ?? null;
  }

  return row?.profiles ?? null;
}

function Progress({
  submitted = false,
}) {
  const items = [
    "Find mentor",
    "View profile",
    "Send request",
  ];

  return (
    <div className="request-flow-progress">
      {items.map(
        (label, index) => {
          const number =
            index + 1;

          const complete =
            number < 3 ||
            (submitted &&
              number === 3);

          const active =
            number === 3 &&
            !submitted;

          return (
            <div
              key={label}
              className={[
                "request-flow-progress-item",
                active
                  ? "is-active"
                  : "",
                complete
                  ? "is-complete"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                {complete ? (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                  />
                ) : (
                  number
                )}
              </span>

              <small>
                {label}
              </small>
            </div>
          );
        },
      )}
    </div>
  );
}

function MentorAvatar({
  profile,
  name,
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  return (
    <span className="request-flow-avatar">
      {profile?.profile_photo_url ? (
        <img
          src={profile.profile_photo_url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            objectFit: "cover",
          }}
        />
      ) : (
        initials || "MC"
      )}
    </span>
  );
}

function SuccessModal({
  mentorName,
  mentoringArea,
  onBackToMentors,
  onViewRequests,
}) {
  return (
    <div
      className="request-success-modal-backdrop"
      role="presentation"
    >
      <section
        className="request-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-success-title"
      >
        <div className="request-success-modal-copy">
          <span className="request-flow-eyebrow">
            REQUEST SENT
          </span>

          <h2 id="request-success-title">
            Your request is on its way.
          </h2>

          <p>
            {mentorName} has received your mentorship
            request. You can track the status from My
            requests.
          </p>
        </div>

        <div className="request-success-modal-summary">
          <div>
            <small>MENTOR</small>

            <strong>
              {mentorName}
            </strong>
          </div>

          <div>
            <small>
              MENTORING AREA
            </small>

            <strong>
              {mentoringArea}
            </strong>
          </div>

          <div>
            <small>STATUS</small>

            <strong>
              Pending review
            </strong>
          </div>
        </div>

        <div className="request-success-modal-actions">
          <button
            type="button"
            className="request-flow-secondary-button"
            onClick={
              onBackToMentors
            }
          >
            Back to mentors
          </button>

          <button
            type="button"
            className="request-flow-primary-button"
            onClick={
              onViewRequests
            }
          >
            View my requests
          </button>
        </div>
      </section>
    </div>
  );
}

function RequestMentorship() {
  const { mentorId } =
    useParams();

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    mentor,
    setMentor,
  ] = useState(null);

  const [
    menteeProfile,
    setMenteeProfile,
  ] = useState(null);

  const [
    existingRequest,
    setExistingRequest,
  ] = useState(null);

  const [form, setForm] =
    useState(initialForm);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

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
          .from(
            "mentor_profiles",
          )
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
          .eq(
            "mentor_id",
            mentorId,
          )
          .eq(
            "approval_status",
            "approved",
          )
          .maybeSingle(),

        supabase
          .from(
            "mentee_profiles",
          )
          .select(`
            biography,
            mentorship_areas,
            development_goals,
            hopes_to_gain,
            conduct_agreed,
            safety_agreed
          `)
          .eq(
            "mentee_id",
            user.id,
          )
          .maybeSingle(),

        supabase
          .from(
            "mentorship_requests",
          )
          .select(`
            id,
            mentoring_area,
            goal_statement,
            status,
            created_at
          `)
          .eq(
            "mentee_id",
            user.id,
          )
          .eq(
            "mentor_id",
            mentorId,
          )
          .in(
            "status",
            [
              "pending",
              "accepted",
              "clarification_requested",
              "referred",
            ],
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
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

      const mentorData =
        mentorResult.data;

      const menteeData =
        menteeProfileResult.data ??
        null;

      setMentor(
        mentorData,
      );

      setMenteeProfile(
        menteeData,
      );

      setExistingRequest(
        existingRequestResult.data ??
          null,
      );

      const mentorAreas =
        mentorData
          .mentorship_categories ??
        [];

      const menteeAreas =
        menteeData
          ?.mentorship_areas ??
        [];

      const firstMatchingArea =
        menteeAreas.find(
          (area) =>
            mentorAreas.includes(
              area,
            ),
        );

      const firstArea =
        firstMatchingArea ||
        mentorAreas[0] ||
        menteeAreas[0] ||
        "";

      setForm(
        (current) => ({
          ...current,
          mentoringArea:
            current.mentoringArea ||
            firstArea,
        }),
      );

      setLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [
    mentorId,
    user?.id,
  ]);

  const profileComplete =
    useMemo(() => {
      if (!menteeProfile) {
        return false;
      }

      return Boolean(
        menteeProfile.biography?.trim() &&
          menteeProfile
            .mentorship_areas
            ?.length > 0 &&
          menteeProfile
            .development_goals
            ?.trim() &&
          menteeProfile
            .hopes_to_gain
            ?.trim() &&
          menteeProfile
            .conduct_agreed &&
          menteeProfile
            .safety_agreed,
      );
    }, [menteeProfile]);

  const availableSpaces =
    mentor
      ? Math.max(
          Number(
            mentor.maximum_active_mentees ??
              0,
          ) -
            Number(
              mentor.current_active_mentees ??
                0,
            ),
          0,
        )
      : 0;

  const mentorUnavailable =
    !mentor?.accepting_requests ||
    availableSpaces <= 0;

  const mentorProfile =
    getProfile(mentor);

  const mentorName =
    mentorProfile?.full_name ||
    "this mentor";

  const goalWordCount =
    countWords(
      form.goalStatement,
    );

  const reasonWordCount =
    countWords(
      form.reasonForChoosingMentor,
    );

  const goalComplete =
    goalWordCount >=
    MIN_GOAL_WORDS;

  const reasonComplete =
    reasonWordCount >=
    MIN_REASON_WORDS;

  const availableAreas =
    useMemo(() => {
      const mentorAreas =
        mentor
          ?.mentorship_categories ??
        [];

      if (
        mentorAreas.length > 0
      ) {
        return mentorAreas;
      }

      return (
        menteeProfile
          ?.mentorship_areas ??
        []
      );
    }, [
      mentor,
      menteeProfile,
    ]);

  const formDisabled =
    submitting ||
    success ||
    !profileComplete ||
    mentorUnavailable ||
    Boolean(existingRequest);

  const canSubmit =
    Boolean(
      form.mentoringArea,
    ) &&
    goalComplete &&
    reasonComplete &&
    !formDisabled;

  function updateForm(event) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );

    setError("");
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    if (success || submitting) {
      return;
    }

    setError("");

    if (!profileComplete) {
      setError(
        "Please complete your mentee profile before requesting mentorship.",
      );

      return;
    }

    if (
      mentorUnavailable
    ) {
      setError(
        "This mentor is not currently accepting new mentorship requests.",
      );

      return;
    }

    if (existingRequest) {
      setError(
        "You already have an active request with this mentor.",
      );

      return;
    }

    if (!form.mentoringArea) {
      setError(
        "Please select a mentoring area.",
      );

      return;
    }

    if (!goalComplete) {
      setError(
        `Your goal statement must contain at least ${MIN_GOAL_WORDS} words.`,
      );

      return;
    }

    if (!reasonComplete) {
      setError(
        `Please use at least ${MIN_REASON_WORDS} words to explain why you chose this mentor.`,
      );

      return;
    }

    setSubmitting(true);

    const {
      error: requestError,
    } = await supabase.rpc(
      "submit_mentorship_request",
      {
        p_mentor_id:
          mentorId,

        p_mentoring_area:
          form.mentoringArea,

        p_goal_statement:
          form.goalStatement.trim(),

        p_reason_for_choosing_mentor:
          form.reasonForChoosingMentor.trim(),

        p_preferred_times:
          form.preferredTimes.trim() ||
          null,
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
        <div className="mentee-request-flow">
          <Progress />

          <section className="request-flow-panel">
            <span className="request-flow-eyebrow">
              MENTORSHIP REQUEST
            </span>

            <h3>
              Preparing your request
            </h3>

            <p>
              Please wait while we prepare the mentorship
              request form.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (!mentor) {
    return (
      <DashboardLayout
        title="Request mentorship"
        description="Tell this mentor what support you are looking for."
      >
        <div className="mentee-request-flow">
          <Progress />

          <section className="request-flow-panel">
            <span className="request-flow-eyebrow">
              MENTOR UNAVAILABLE
            </span>

            <h3>
              We cannot prepare this request
            </h3>

            <p>{error}</p>

            <div
              className="request-flow-bottom-action"
              style={{
                marginTop: "18px",
                justifyContent: "flex-start",
              }}
            >
              <button
                type="button"
                className="request-flow-secondary-button"
                onClick={() =>
                  navigate(
                    "/mentee/find-mentor",
                  )
                }
              >
                Back to mentors
              </button>
            </div>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request mentorship"
      description={`Tell ${mentorName} what support you are looking for.`}
    >
      <div className="mentee-request-flow">
        <button
          type="button"
          className="request-flow-top-back"
          disabled={submitting}
          onClick={() =>
            navigate(
              `/mentee/mentors/${mentorId}`,
            )
          }
        >
          <ArrowLeft size={15} />
          Back to mentor profile
        </button>

        <Progress
          submitted={success}
        />

        <div className="request-flow-screen">
          <section className="request-flow-request-heading">
            <span className="request-flow-eyebrow">
              MENTORSHIP REQUEST
            </span>

            <h2>
              Tell{" "}
              {mentorName.split(
                " ",
              )[0]}{" "}
              what you would like support with.
            </h2>

            <p>
              Keep your request focused. Your mentee
              profile already provides the mentor with your
              wider background and goals.
            </p>
          </section>

          <section className="request-flow-selected-mentor">
            <div className="request-flow-selected-mentor-main">
              <MentorAvatar
                profile={
                  mentorProfile
                }
                name={
                  mentorName
                }
              />

              <div>
                <small>
                  REQUESTING MENTORSHIP FROM
                </small>

                <strong>
                  {mentorName}
                </strong>

                <span>
                  {mentor.job_title ||
                    "Mentor"}

                  {mentor.organisation
                    ? ` · ${mentor.organisation}`
                    : ""}
                </span>
              </div>
            </div>
          </section>

          {!profileComplete && (
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                PROFILE REQUIRED
              </span>

              <h3>
                Complete your mentee profile first
              </h3>

              <p>
                Your mentor needs your profile to understand
                your goals before deciding whether to accept
                the request.
              </p>

              <div
                className="request-flow-bottom-action"
                style={{
                  marginTop: "18px",
                  justifyContent:
                    "flex-start",
                }}
              >
                <button
                  type="button"
                  className="request-flow-primary-button"
                  onClick={() =>
                    navigate(
                      "/mentee/profile",
                    )
                  }
                >
                  <UserRoundCheck
                    size={16}
                  />
                  Complete my profile
                </button>
              </div>
            </section>
          )}

          {existingRequest && (
            <aside
              className="request-flow-note"
              role="status"
            >
              <CircleAlert
                size={18}
              />

              <p>
                You already have an active request with this
                mentor. Current status:{" "}
                <strong>
                  {String(
                    existingRequest.status,
                  ).replaceAll(
                    "_",
                    " ",
                  )}
                </strong>
                .
              </p>
            </aside>
          )}

          {mentorUnavailable && (
            <aside
              className="request-flow-note"
              role="status"
            >
              <CircleAlert
                size={18}
              />

              <p>
                This mentor is not currently accepting new
                mentorship requests.
              </p>
            </aside>
          )}

          <form
            className="request-flow-form"
            onSubmit={
              handleSubmit
            }
          >
            <label>
              <span>
                Desired mentoring area
                <b>*</b>
              </span>

              <div className="request-flow-select-wrap">
                <select
                  name="mentoringArea"
                  value={
                    form.mentoringArea
                  }
                  onChange={
                    updateForm
                  }
                  disabled={
                    formDisabled
                  }
                  required
                >
                  <option value="">
                    Select an area
                  </option>

                  {availableAreas.map(
                    (area) => (
                      <option
                        key={area}
                        value={area}
                      >
                        {area}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="request-flow-select-icon"
                  aria-hidden="true"
                />
              </div>

              <small>
                Choose the main area you want this mentor to
                support you with.
              </small>
            </label>

            <label>
              <span>
                Short goal statement
                <b>*</b>
              </span>

              <textarea
                name="goalStatement"
                rows={4}
                value={
                  form.goalStatement
                }
                onChange={
                  updateForm
                }
                disabled={
                  formDisabled
                }
                placeholder="For example: I want to become more confident leading meetings and communicating decisions."
                required
              />

              <div className="request-flow-field-footer">
                <small>
                  Explain what progress would look like for
                  you.
                </small>

                <span
                  className={
                    goalComplete
                      ? "is-complete"
                      : ""
                  }
                >
                  {goalWordCount}/
                  {MIN_GOAL_WORDS} words minimum
                </span>
              </div>
            </label>

            <label>
              <span>
                Why are you choosing this mentor?
                <b>*</b>
              </span>

              <textarea
                name="reasonForChoosingMentor"
                rows={4}
                value={
                  form.reasonForChoosingMentor
                }
                onChange={
                  updateForm
                }
                disabled={
                  formDisabled
                }
                placeholder="Share what about this mentor's experience feels relevant to your goal."
                required
              />

              <div className="request-flow-field-footer">
                <small>
                  This helps the mentor understand why you
                  think the match could work.
                </small>

                <span
                  className={
                    reasonComplete
                      ? "is-complete"
                      : ""
                  }
                >
                  {reasonWordCount}/
                  {MIN_REASON_WORDS} words minimum
                </span>
              </div>
            </label>

            <label>
              <span>
                Preferred times
                <em>Optional</em>
              </span>

              <input
                type="text"
                name="preferredTimes"
                value={
                  form.preferredTimes
                }
                onChange={
                  updateForm
                }
                disabled={
                  formDisabled
                }
                placeholder="For example: Weekday evenings or Saturday mornings"
              />

              <small>
                This is only a preference. Booking happens
                after the mentor accepts your request.
              </small>
            </label>

            <aside className="request-flow-note">
              <CalendarDays
                size={18}
              />

              <p>
                Sending this request does not book a session.
                If the mentor accepts, you will choose from
                their available session times.
              </p>
            </aside>

            {error && (
              <aside
                className="request-flow-note"
                role="alert"
              >
                <CircleAlert
                  size={18}
                />

                <p>{error}</p>
              </aside>
            )}

            <div className="request-flow-submit-row">
              <p
                className={
                  canSubmit
                    ? "request-flow-submit-hint is-ready"
                    : "request-flow-submit-hint"
                }
                aria-live="polite"
              >
                {submitting
                  ? "Sending your request..."
                  : goalComplete &&
                      reasonComplete &&
                      form.mentoringArea &&
                      !formDisabled
                    ? "Your request is ready to send."
                    : `Enter at least ${MIN_GOAL_WORDS} words for your goal and ${MIN_REASON_WORDS} words for why you chose this mentor.`}
              </p>

              <div className="request-flow-form-actions">
                <button
                  type="button"
                  className="request-flow-secondary-button"
                  onClick={() =>
                    navigate(
                      `/mentee/mentors/${mentorId}`,
                    )
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="request-flow-primary-button"
                  disabled={
                    !canSubmit
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit request"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {success && (
          <SuccessModal
            mentorName={
              mentorName
            }
            mentoringArea={
              form.mentoringArea
            }
            onBackToMentors={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
            onViewRequests={() =>
              navigate(
                "/mentee/requests",
              )
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default RequestMentorship;
