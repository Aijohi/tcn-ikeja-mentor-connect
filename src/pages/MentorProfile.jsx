import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Languages,
  MessageCircle,
  Users,
  Video,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorProfile.css";

function MentorProfile() {
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
    relationship,
    setRelationship,
  ] = useState(null);

  const [
    relationshipCheckFailed,
    setRelationshipCheckFailed,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentor() {
      if (!mentorId) {
        return;
      }

      setLoading(true);
      setError("");
      setRelationshipCheckFailed(
        false,
      );

      const {
        data:
          mentorData,
        error:
          mentorError,
      } = await supabase
        .from(
          "mentor_profiles",
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
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (mentorError) {
        console.error(
          "Unable to load mentor profile:",
          mentorError.message,
        );

        setError(
          "We could not load this mentor profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!mentorData) {
        setError(
          "This mentor profile is no longer available.",
        );

        setLoading(false);
        return;
      }

      setMentor(
        mentorData,
      );

      if (!user?.id) {
        setRelationship(
          null,
        );
        setLoading(false);
        return;
      }

      const {
        data:
          relationshipData,
        error:
          relationshipError,
      } = await supabase
        .from(
          "mentorship_requests",
        )
        .select(`
          id,
          mentor_id,
          mentee_id,
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
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (
        relationshipError
      ) {
        console.error(
          "Unable to load mentorship relationship:",
          relationshipError.message,
        );

        /*
         * Do not assume there is no request when the relationship
         * check failed. This prevents accidentally showing another
         * Request mentorship button.
         */
        setRelationship(
          null,
        );

        setRelationshipCheckFailed(
          true,
        );

        setLoading(false);
        return;
      }

      setRelationship(
        relationshipData ??
          null,
      );

      setLoading(false);
    }

    loadMentor();

    return () => {
      isMounted = false;
    };
  }, [
    mentorId,
    user?.id,
  ]);

  if (loading) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading mentor profile
          </h2>

          <p>
            Please wait while we prepare this mentor's information.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (
    error ||
    !mentor
  ) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <section className="dashboard-empty-state">
          <h2>
            Mentor profile unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
          >
            Back to mentors
          </button>
        </section>
      </DashboardLayout>
    );
  }

  const profile =
    mentor.profiles;

  const fullName =
    profile?.full_name ||
    "Approved mentor";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) =>
        name
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  const maximumActiveMentees =
    Number(
      mentor.maximum_active_mentees ??
        0,
    );

  const currentActiveMentees =
    Number(
      mentor.current_active_mentees ??
        0,
    );

  const availableSpaces =
    Math.max(
      maximumActiveMentees -
        currentActiveMentees,
      0,
    );

  const hasCapacity =
    availableSpaces > 0;

  const acceptingRequests =
    mentor.accepting_requests ===
    true;

  const canRequest =
    hasCapacity &&
    acceptingRequests;

  const status =
    relationship?.status ??
    null;

  const hasExistingRelationship =
    Boolean(
      relationship?.id,
    );

  const meetingFormats =
    mentor.meeting_formats
      ?.length > 0
      ? mentor.meeting_formats.join(
          ", ",
        )
      : "Not specified";

  const languages =
    mentor.languages
      ?.length > 0
      ? mentor.languages.join(
          ", ",
        )
      : "Not specified";

  const sessionLengths =
    mentor.session_lengths
      ?.length > 0
      ? mentor.session_lengths
          .map((length) =>
            typeof length ===
            "number"
              ? `${length} minutes`
              : length,
          )
          .join(", ")
      : "Not specified";

  function getPageDescription() {
    switch (status) {
      case "accepted":
        return "View your mentor's profile and continue your active mentorship.";

      case "pending":
        return "Your mentorship request is waiting for this mentor's response.";

      case "clarification_requested":
        return "This mentor needs more information before deciding on your request.";

      case "declined":
        return "Review this mentor and the outcome of your previous request.";

      case "referred":
        return "Review this mentor and the referral outcome of your previous request.";

      case "withdrawn":
        return "Review this mentor or request mentorship again if they are available.";

      default:
        return "Learn more about this mentor before deciding to request mentorship.";
    }
  }

  function getAvailabilityTitle() {
    if (
      relationshipCheckFailed
    ) {
      return "Request status unavailable";
    }

    switch (status) {
      case "accepted":
        return "Active mentorship";

      case "pending":
        return "Request pending";

      case "clarification_requested":
        return "Clarification needed";

      case "declined":
        return "Request declined";

      case "referred":
        return "Referred for another match";

      case "withdrawn":
        return "Previous request withdrawn";

      default:
        if (!hasCapacity) {
          return "Currently at capacity";
        }

        return `${availableSpaces} ${
          availableSpaces ===
          1
            ? "space"
            : "spaces"
        } available`;
    }
  }

  function getAvailabilityMessage() {
    if (
      relationshipCheckFailed
    ) {
      return "We could not verify your existing mentorship request. Refresh the page before taking another action.";
    }

    switch (status) {
      case "accepted":
        return `${fullName} is currently your mentor. You can message your mentor and view your sessions.`;

      case "pending":
        return "You have already sent a mentorship request. You do not need to send another one.";

      case "clarification_requested":
        return `${fullName} needs more information from you before making a decision.`;

      case "declined":
        return "This mentorship request was declined. You can review the request details or find another mentor.";

      case "referred":
        return "This request was referred for another match. You can review the reason and find another mentor.";

      case "withdrawn":
        if (canRequest) {
          return "Your previous request was withdrawn. You can send a new request if you are ready.";
        }

        return "Your previous request was withdrawn. This mentor is not currently available for a new request.";

      default:
        if (!hasCapacity) {
          return "This mentor does not have an open mentoring space right now.";
        }

        if (!acceptingRequests) {
          return "This mentor has available capacity but is not accepting new requests right now.";
        }

        return "This mentor is currently accepting mentorship requests.";
    }
  }

  function getRelationshipTone() {
    switch (status) {
      case "accepted":
        return "accepted";

      case "pending":
      case "clarification_requested":
        return "pending";

      case "declined":
        return "declined";

      case "referred":
        return "referred";

      case "withdrawn":
        return "withdrawn";

      default:
        return canRequest
          ? "available"
          : "unavailable";
    }
  }

  function renderRelationshipActions() {
    if (
      relationshipCheckFailed
    ) {
      return (
        <button
          type="button"
          className="primary-button"
          disabled
        >
          Unable to verify request status
        </button>
      );
    }

    if (
      !hasExistingRelationship
    ) {
      return (
        <button
          type="button"
          className="primary-button"
          disabled={
            !canRequest
          }
          onClick={() =>
            navigate(
              `/mentee/mentors/${mentor.mentor_id}/request`,
            )
          }
        >
          {canRequest
            ? "Request mentorship"
            : !hasCapacity
              ? "Mentor at capacity"
              : "Not accepting requests"}
        </button>
      );
    }

    switch (status) {
      case "accepted":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  "/mentee/sessions",
                )
              }
            >
              View sessions
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  `/mentee/messages?mentor=${mentor.mentor_id}`,
                )
              }
            >
              <MessageCircle
                size={16}
              />
              Message mentor
            </button>
          </>
        );

      case "pending":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              disabled
            >
              Request pending
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              View request
            </button>
          </>
        );

      case "clarification_requested":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              View request
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              Respond to clarification
            </button>
          </>
        );

      case "declined":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              View details
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  "/mentee/find-mentor",
                )
              }
            >
              Find another mentor
            </button>
          </>
        );

      case "referred":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              View details
            </button>

            <button
              type="button"
              className="mentor-profile-referred-action"
              onClick={() =>
                navigate(
                  "/mentee/find-mentor",
                )
              }
            >
              Find another mentor
            </button>
          </>
        );

      case "withdrawn":
        return (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/requests/${relationship.id}`,
                )
              }
            >
              View previous request
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={
                !canRequest
              }
              onClick={() =>
                navigate(
                  `/mentee/mentors/${mentor.mentor_id}/request`,
                )
              }
            >
              {canRequest
                ? "Request mentorship"
                : "Mentor unavailable"}
            </button>
          </>
        );

      default:
        return (
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/mentee/requests",
              )
            }
          >
            View my requests
          </button>
        );
    }
  }

  return (
    <DashboardLayout
      title="Mentor profile"
      description={
        getPageDescription()
      }
    >
      <div className="mentor-profile-page">
        <button
          type="button"
          className="mentor-profile-back"
          onClick={() =>
            navigate(
              "/mentee/find-mentor",
            )
          }
        >
          <ArrowLeft
            size={16}
          />
          Back to mentors
        </button>

        <section className="mentor-profile-hero">
          <div className="mentor-profile-identity">
            {profile?.profile_photo_url ? (
              <img
                src={
                  profile.profile_photo_url
                }
                alt=""
                className="mentor-profile-avatar"
              />
            ) : (
              <span className="mentor-profile-avatar mentor-profile-initials">
                {initials ||
                  "MC"}
              </span>
            )}

            <div className="mentor-profile-copy">
              <span className="mentor-profile-label">
                Approved mentor
              </span>

              <h2>
                {fullName}
              </h2>

              <p className="mentor-profile-role">
                {mentor.job_title ||
                  "Mentor"}

                {mentor.organisation
                  ? ` at ${mentor.organisation}`
                  : ""}
              </p>
            </div>
          </div>

          <div
            className={`mentor-profile-availability relationship-${getRelationshipTone()}`}
          >
            <strong>
              {getAvailabilityTitle()}
            </strong>

            <small>
              {getAvailabilityMessage()}
            </small>
          </div>
        </section>

        <div className="mentor-profile-grid">
          <section className="mentor-profile-card">
            <div className="mentor-profile-section">
              <h3>
                About this mentor
              </h3>

              <p>
                {mentor.biography ||
                  "This mentor has not added a biography yet."}
              </p>
            </div>

            <div className="mentor-profile-section">
              <h3 className="mentor-profile-section-heading">
                Areas of expertise
              </h3>

              {mentor.expertise
                ?.length > 0 ? (
                <div className="mentor-profile-tags">
                  {mentor.expertise.map(
                    (
                      expertise,
                    ) => (
                      <span
                        key={
                          expertise
                        }
                      >
                        {
                          expertise
                        }
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p>
                  No areas of expertise have been provided.
                </p>
              )}
            </div>

            <div className="mentor-profile-section">
              <h3 className="mentor-profile-section-heading">
                Mentorship categories
              </h3>

              {mentor.mentorship_categories
                ?.length > 0 ? (
                <div className="mentor-profile-tags">
                  {mentor.mentorship_categories.map(
                    (
                      category,
                    ) => (
                      <span
                        key={
                          category
                        }
                      >
                        {
                          category
                        }
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p>
                  No mentorship categories have been provided.
                </p>
              )}
            </div>
          </section>

          <aside className="mentor-profile-card">
            <div className="mentor-profile-detail-list">
              <div className="mentor-profile-detail-row">
                <BriefcaseBusiness
                  size={18}
                />

                <div>
                  <strong>
                    Experience
                  </strong>

                  <span>
                    {mentor.years_of_experience
                      ? `${mentor.years_of_experience} years`
                      : "Not specified"}
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Building2
                  size={18}
                />

                <div>
                  <strong>
                    Organisation
                  </strong>

                  <span>
                    {mentor.organisation ||
                      "Not specified"}
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Languages
                  size={18}
                />

                <div>
                  <strong>
                    Languages
                  </strong>

                  <span>
                    {languages}
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Video
                  size={18}
                />

                <div>
                  <strong>
                    Meeting format
                  </strong>

                  <span>
                    {
                      meetingFormats
                    }
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Clock3
                  size={18}
                />

                <div>
                  <strong>
                    Preferred session length
                  </strong>

                  <span>
                    {
                      sessionLengths
                    }
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Users
                  size={18}
                />

                <div>
                  <strong>
                    Mentorship capacity
                  </strong>

                  <span>
                    {
                      currentActiveMentees
                    }{" "}
                    of{" "}
                    {
                      maximumActiveMentees
                    }{" "}
                    active mentee spaces currently used
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mentor-profile-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
          >
            Back to mentors
          </button>

          {renderRelationshipActions()}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MentorProfile;
