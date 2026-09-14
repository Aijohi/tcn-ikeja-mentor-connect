import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Languages,
  Users,
  Video,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

function MentorProfile() {
  const { mentorId } = useParams();
  const navigate = useNavigate();

  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentor() {
      setLoading(true);
      setError("");

      const { data, error: mentorError } =
        await supabase
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
            approval_status,
            profiles!mentor_profiles_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("mentor_id", mentorId)
          .eq("approval_status", "approved")
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

      if (!data) {
        setError(
          "This mentor profile is no longer available.",
        );

        setLoading(false);
        return;
      }

      setMentor(data);
      setLoading(false);
    }

    loadMentor();

    return () => {
      isMounted = false;
    };
  }, [mentorId]);

  if (loading) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>Loading mentor profile</h2>

          <p>
            Please wait while we prepare this mentor's
            information.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (error || !mentor) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <section className="dashboard-empty-state">
          <h2>Mentor profile unavailable</h2>

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

  const profile = mentor.profiles;

  const fullName =
    profile?.full_name || "Approved mentor";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) =>
      name.charAt(0).toUpperCase(),
    )
    .join("");

  const maximumActiveMentees =
    Number(
      mentor.maximum_active_mentees ?? 0,
    );

  const currentActiveMentees =
    Number(
      mentor.current_active_mentees ?? 0,
    );

  const availableSpaces = Math.max(
    maximumActiveMentees -
      currentActiveMentees,
    0,
  );

  const hasCapacity =
    availableSpaces > 0;

  const acceptingRequests =
    mentor.accepting_requests === true;

  const canRequest =
    hasCapacity &&
    acceptingRequests;

  const meetingFormats =
    mentor.meeting_formats?.length > 0
      ? mentor.meeting_formats.join(", ")
      : "Not specified";

  const languages =
    mentor.languages?.length > 0
      ? mentor.languages.join(", ")
      : "Not specified";

  const sessionLengths =
    mentor.session_lengths?.length > 0
      ? mentor.session_lengths
          .map((length) =>
            typeof length === "number"
              ? `${length} minutes`
              : length,
          )
          .join(", ")
      : "Not specified";

  function getAvailabilityTitle() {
    if (!hasCapacity) {
      return "Currently at capacity";
    }

    return `${availableSpaces} ${
      availableSpaces === 1
        ? "space"
        : "spaces"
    } available`;
  }

  function getAvailabilityMessage() {
    if (!hasCapacity) {
      return "This mentor does not have an open mentoring space right now.";
    }

    if (!acceptingRequests) {
      return "This mentor has available capacity but is not accepting new requests right now.";
    }

    return "This mentor is currently accepting mentorship requests.";
  }

  function getRequestButtonLabel() {
    if (!hasCapacity) {
      return "Mentor at capacity";
    }

    if (!acceptingRequests) {
      return "Not accepting requests";
    }

    return "Request mentorship";
  }

  return (
    <DashboardLayout
      title="Mentor profile"
      description="Learn more about this mentor before deciding to request mentorship."
    >
      <div className="mentor-profile-page">
        <button
          type="button"
          className="mentor-profile-back"
          onClick={() =>
            navigate("/mentee/find-mentor")
          }
        >
          <ArrowLeft size={16} />
          Back to mentors
        </button>

        <section className="mentor-profile-hero">
          <div className="mentor-profile-identity">
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt=""
                className="mentor-profile-avatar"
              />
            ) : (
              <span className="mentor-profile-avatar mentor-profile-initials">
                {initials || "MC"}
              </span>
            )}

            <div className="mentor-profile-copy">
              <span className="mentor-profile-label">
                Approved mentor
              </span>

              <h2>{fullName}</h2>

              <p className="mentor-profile-role">
                {mentor.job_title || "Mentor"}

                {mentor.organisation
                  ? ` at ${mentor.organisation}`
                  : ""}
              </p>
            </div>
          </div>

          <div
            className={`mentor-profile-availability ${
              canRequest
                ? ""
                : "at-capacity"
            }`}
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
              <h3>About this mentor</h3>

              <p>
                {mentor.biography ||
                  "This mentor has not added a biography yet."}
              </p>
            </div>

            <div className="mentor-profile-section">
              <h3 className="mentor-profile-section-heading">
                Areas of expertise
              </h3>

              {mentor.expertise?.length > 0 ? (
                <div className="mentor-profile-tags">
                  {mentor.expertise.map(
                    (expertise) => (
                      <span key={expertise}>
                        {expertise}
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

              {mentor.mentorship_categories?.length > 0 ? (
                <div className="mentor-profile-tags">
                  {mentor.mentorship_categories.map(
                    (category) => (
                      <span key={category}>
                        {category}
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
                <BriefcaseBusiness size={18} />

                <div>
                  <strong>Experience</strong>

                  <span>
                    {mentor.years_of_experience
                      ? `${mentor.years_of_experience} years`
                      : "Not specified"}
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Building2 size={18} />

                <div>
                  <strong>Organisation</strong>

                  <span>
                    {mentor.organisation ||
                      "Not specified"}
                  </span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Languages size={18} />

                <div>
                  <strong>Languages</strong>
                  <span>{languages}</span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Video size={18} />

                <div>
                  <strong>Meeting format</strong>
                  <span>{meetingFormats}</span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Clock3 size={18} />

                <div>
                  <strong>
                    Preferred session length
                  </strong>

                  <span>{sessionLengths}</span>
                </div>
              </div>

              <div className="mentor-profile-detail-row">
                <Users size={18} />

                <div>
                  <strong>
                    Mentorship capacity
                  </strong>

                  <span>
                    {currentActiveMentees} of{" "}
                    {maximumActiveMentees} active
                    mentee spaces currently used
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
              navigate("/mentee/find-mentor")
            }
          >
            Back to mentors
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={!canRequest}
            onClick={() =>
              navigate(
                `/mentee/mentors/${mentor.mentor_id}/request`,
              )
            }
          >
            {getRequestButtonLabel()}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MentorProfile;
