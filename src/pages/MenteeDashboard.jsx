import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  HeartHandshake,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import "./MenteeDashboard.css";

function MenteeDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [menteeProfile, setMenteeProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [nextSession, setNextSession] = useState(null);
  const [recommendedMentors, setRecommendedMentors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const [
        menteeProfileResult,
        requestsResult,
        sessionResult,
        mentorsResult,
      ] = await Promise.all([
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
            mentor_id,
            mentoring_area,
            status,
            created_at,
            mentor:profiles!mentorship_requests_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("mentee_id", user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("mentorship_sessions")
          .select(`
            id,
            mentor_id,
            scheduled_start,
            scheduled_end,
            meeting_format,
            status,
            mentor:profiles!mentorship_sessions_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("mentee_id", user.id)
          .in("status", [
            "scheduled",
            "reschedule_requested",
          ])
          .gte(
            "scheduled_end",
            new Date().toISOString(),
          )
          .order("scheduled_start", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("mentor_profiles")
          .select(`
            mentor_id,
            job_title,
            organisation,
            mentorship_categories,
            expertise,
            maximum_active_mentees,
            current_active_mentees,
            accepting_requests,
            approval_status,
            profiles!mentor_profiles_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("approval_status", "approved")
          .eq("accepting_requests", true)
          .limit(8),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        menteeProfileResult.error ||
        requestsResult.error ||
        sessionResult.error ||
        mentorsResult.error;

      if (firstError) {
        console.error(
          "Unable to load mentee dashboard:",
          firstError.message,
        );

        setError(
          "We could not load all of your dashboard information. Please try again.",
        );

        setLoading(false);
        return;
      }

      const profileData =
        menteeProfileResult.data ?? null;

      const mentorAreas =
        profileData?.mentorship_areas ?? [];

      const mentors = (mentorsResult.data ?? []).filter(
        (mentor) => {
          const maximumActive =
            Number(
              mentor.maximum_active_mentees ??
                0,
            );

          const currentActive =
            Number(
              mentor.current_active_mentees ??
                0,
            );

          return (
            mentor.accepting_requests === true &&
            maximumActive - currentActive > 0
          );
        },
      );

      const activeMentorIds =
        new Set(
          (requestsResult.data ?? [])
            .filter((request) =>
              [
                "pending",
                "accepted",
                "clarification_requested",
              ].includes(
                String(request.status),
              ),
            )
            .map(
              (request) =>
                request.mentor_id,
            ),
        );

      const recommendableMentors =
        mentors.filter(
          (mentor) =>
            !activeMentorIds.has(
              mentor.mentor_id,
            ),
        );

      const rankedMentors = [
        ...recommendableMentors,
      ].sort(
        (first, second) => {
          const firstScore =
            getMentorMatchScore(
              first,
              mentorAreas,
            );

          const secondScore =
            getMentorMatchScore(
              second,
              mentorAreas,
            );

          return secondScore - firstScore;
        },
      );

      setMenteeProfile(profileData);
      setRequests(requestsResult.data ?? []);
      setNextSession(sessionResult.data ?? null);
      setRecommendedMentors(
        rankedMentors.slice(0, 3),
      );

      setLoading(false);
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const profileCompletion = useMemo(
    () =>
      getProfileCompletion(
        menteeProfile,
      ),
    [menteeProfile],
  );

  const latestRequest =
    requests[0] ?? null;

  const activeRequest =
    requests.find((request) =>
      [
        "pending",
        "accepted",
        "clarification_requested",
      ].includes(
        String(request.status),
      ),
    ) ?? null;

  const acceptedRequest =
    requests.find(
      (request) =>
        String(request.status) ===
        "accepted",
    ) ?? null;

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "there";

  const firstName =
    displayName.split(" ")[0];

  if (loading) {
    return (
      <DashboardLayout
        title="Overview"
        description="Your mentoring journey at a glance."
      >
        <div className="mentee-overview-page">
          <section className="dashboard-empty-state">
            <div className="loader" />

            <h2>Preparing your overview</h2>

            <p>
              Please wait while we bring your mentoring
              information together.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Overview"
        description="Your mentoring journey at a glance."
      >
        <div className="mentee-overview-page">
          <section className="dashboard-empty-state">
            <span className="empty-state-icon">
              <HeartHandshake size={30} />
            </span>

            <h2>Unable to load your overview</h2>

            <p>{error}</p>

            <button
              type="button"
              className="primary-button mentee-button mentee-button--medium"
              onClick={() =>
                window.location.reload()
              }
            >
              Try again
            </button>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Overview"
      description="Your mentoring journey at a glance."
    >
      <div className="mentee-overview-page">
        <section className="mentee-overview-hero">
        <div className="mentee-overview-hero-copy">
          <span className="eyebrow">
            PURPOSEFUL GROWTH
          </span>

          <h2>
            Welcome back, {firstName}.
          </h2>

          <p>
            Find the right guidance, keep track of your
            requests and stay connected to your mentoring
            journey.
          </p>
        </div>
      </section>

      <section className="mentee-overview-stat-grid">
        <OverviewStatCard
          icon={<UserRound size={19} />}
          label="Profile completion"
          value={`${profileCompletion}%`}
          helper={
            profileCompletion === 100
              ? "Ready for mentorship requests"
              : "Complete your mentee profile"
          }
          onClick={() =>
            navigate("/mentee/profile")
          }
        />

        <OverviewStatCard
          icon={
            <GitPullRequest size={19} />
          }
          label="Mentorship requests"
          value={String(requests.length)}
          helper={
            latestRequest
              ? formatStatus(
                  latestRequest.status,
                )
              : "No request sent yet"
          }
          onClick={() =>
            navigate("/mentee/requests")
          }
        />

        <OverviewStatCard
          icon={
            <CalendarDays size={19} />
          }
          label="Next session"
          value={
            nextSession
              ? formatShortDate(
                  nextSession.scheduled_start,
                )
              : "None"
          }
          helper={
            nextSession
              ? formatTime(
                  nextSession.scheduled_start,
                )
              : acceptedRequest
                ? "Waiting to be scheduled"
                : "No upcoming session"
          }
          onClick={() =>
            navigate("/mentee/sessions")
          }
        />

        <OverviewStatCard
          icon={
            <MessageCircle size={19} />
          }
          label="Messages"
          value={
            acceptedRequest
              ? "Available"
              : "Locked"
          }
          helper={
            acceptedRequest
              ? "Message your accepted mentor"
              : "Unlocks after acceptance"
          }
          onClick={() =>
            navigate("/mentee/messages")
          }
        />
      </section>

      <div className="mentee-overview-main-grid">
        <section className="mentee-overview-panel">
          <div className="mentee-overview-panel-heading">
            <div>
              <span className="eyebrow">
                YOUR NEXT STEP
              </span>

              <h3>
                {getJourneyTitle({
                  profileCompletion,
                  activeRequest,
                  nextSession,
                })}
              </h3>
            </div>
          </div>

          <JourneyState
            profileCompletion={
              profileCompletion
            }
            activeRequest={activeRequest}
            nextSession={nextSession}
            onProfile={() =>
              navigate("/mentee/profile")
            }
            onRequests={() =>
              navigate("/mentee/requests")
            }
            onSessions={() =>
              navigate("/mentee/sessions")
            }
            onFindMentor={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
          />
        </section>

        <aside className="mentee-overview-safety">
          <span className="mentee-overview-safety-icon">
            <ShieldCheck size={22} />
          </span>

          <div>
            <span className="eyebrow">
              STAY SAFE
            </span>

            <h3>
              Keep mentoring communication safe.
            </h3>

            <p>
              Never share passwords, one-time codes, bank
              PINs or send money because someone asks during
              a mentoring conversation.
            </p>
          </div>
        </aside>
      </div>

      <section className="mentee-overview-recommendations">
        <div className="mentee-overview-section-heading">
          <div>
            <span className="eyebrow">
              DISCOVER MENTORS
            </span>

            <h3>
              Mentors you may connect with
            </h3>

            <p>
              Recommendations are based on your selected
              mentorship areas and mentors who currently
              have space for a new mentee.
            </p>
          </div>

          <button
            type="button"
            className="mentee-overview-text-button"
            onClick={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
          >
            View all mentors
            <ArrowRight size={15} />
          </button>
        </div>

        {recommendedMentors.length ===
        0 ? (
          <div className="mentee-overview-inline-empty">
            <Search size={24} />

            <div>
              <h4>
                No available mentors yet
              </h4>

              <p>
                Approved mentors who are accepting requests
                and have available space will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mentee-overview-mentor-grid">
            {recommendedMentors.map(
              (mentor) => (
                <RecommendedMentorCard
                  key={mentor.mentor_id}
                  mentor={mentor}
                  onView={() =>
                    navigate(
                      `/mentee/mentors/${mentor.mentor_id}`,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
      </div>
    </DashboardLayout>
  );
}

function OverviewStatCard({
  icon,
  label,
  value,
  helper,
  onClick,
}) {
  return (
    <button
      type="button"
      className="mentee-overview-stat-card"
      onClick={onClick}
    >
      <span className="mentee-overview-stat-icon">
        {icon}
      </span>

      <span className="mentee-overview-stat-copy">
        <small>{label}</small>

        <strong>{value}</strong>

        <span>{helper}</span>
      </span>

      <ArrowRight
        size={15}
        className="mentee-overview-stat-arrow"
      />
    </button>
  );
}

function JourneyState({
  profileCompletion,
  activeRequest,
  nextSession,
  onProfile,
  onRequests,
  onSessions,
  onFindMentor,
}) {
  if (profileCompletion < 100) {
    return (
      <div className="mentee-overview-journey-state">
        <span className="mentee-overview-journey-icon">
          <UserRound size={21} />
        </span>

        <div>
          <h4>
            Complete your mentee profile
          </h4>

          <p>
            Your profile gives mentors enough context to
            understand your goals before they respond to a
            mentorship request.
          </p>

          <div className="mentee-overview-progress">
            <span>
              <i
                style={{
                  width: `${profileCompletion}%`,
                }}
              />
            </span>

            <small>
              {profileCompletion}% complete
            </small>
          </div>

          <button
            type="button"
            className="primary-button mentee-button mentee-button--medium"
            onClick={onProfile}
          >
            Complete my profile
          </button>
        </div>
      </div>
    );
  }

  if (nextSession) {
    return (
      <div className="mentee-overview-journey-state">
        <span className="mentee-overview-journey-icon">
          <CalendarDays size={21} />
        </span>

        <div>
          <h4>
            Your next session is scheduled
          </h4>

          <p>
            You have a session with{" "}
            <strong>
              {nextSession.mentor
                ?.full_name || "your mentor"}
            </strong>{" "}
            on{" "}
            {formatLongDate(
              nextSession.scheduled_start,
            )}{" "}
            at{" "}
            {formatTime(
              nextSession.scheduled_start,
            )}.
          </p>

          <button
            type="button"
            className="primary-button mentee-button mentee-button--medium"
            onClick={onSessions}
          >
            View session
          </button>
        </div>
      </div>
    );
  }

  if (activeRequest) {
    const status =
      String(activeRequest.status);

    return (
      <div className="mentee-overview-journey-state">
        <span className="mentee-overview-journey-icon">
          {status === "accepted" ? (
            <CheckCircle2 size={21} />
          ) : (
            <Clock3 size={21} />
          )}
        </span>

        <div>
          <h4>
            {status === "accepted"
              ? "Your mentorship request was accepted"
              : status ===
                  "clarification_requested"
                ? "Your mentor needs more information"
                : status === "referred"
                  ? "Your request has been referred"
                  : "Your request is being reviewed"}
          </h4>

          <p>
            {activeRequest.mentor
              ?.full_name || "Your mentor"}{" "}
            ·{" "}
            {activeRequest.mentoring_area ||
              "Mentorship"}
          </p>

          <button
            type="button"
            className="primary-button mentee-button mentee-button--medium"
            onClick={onRequests}
          >
            View my request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mentee-overview-journey-state">
      <span className="mentee-overview-journey-icon">
        <Search size={21} />
      </span>

      <div>
        <h4>
          Find a mentor who fits your goals
        </h4>

        <p>
          Your profile is ready. Explore approved mentors
          and choose someone whose experience aligns with
          what you want to work on.
        </p>

        <button
          type="button"
          className="primary-button mentee-button mentee-button--medium"
          onClick={onFindMentor}
        >
          Find a mentor
        </button>
      </div>
    </div>
  );
}

function RecommendedMentorCard({
  mentor,
  onView,
}) {
  const name =
    mentor.profiles?.full_name ||
    "Approved mentor";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");

  const availableSpaces =
    Math.max(
      (mentor.maximum_active_mentees ??
        0) -
        (mentor.current_active_mentees ??
          0),
      0,
    );

  return (
    <article className="mentee-overview-mentor-card">
      <div className="mentee-overview-mentor-header">
        {mentor.profiles?.profile_photo_url ? (
          <img
            src={
              mentor.profiles
                .profile_photo_url
            }
            alt=""
          />
        ) : (
          <span className="mentee-overview-mentor-avatar">
            {initials || "MC"}
          </span>
        )}

        <div>
          <small>
            TCN IKEJA APPROVED MENTOR
          </small>

          <h4>{name}</h4>

          <p>
            {mentor.job_title ||
              "Mentor"}
            {mentor.organisation
              ? ` · ${mentor.organisation}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mentee-overview-mentor-tags">
        {(mentor.mentorship_categories ??
          [])
          .slice(0, 3)
          .map((category) => (
            <span key={category}>
              {category}
            </span>
          ))}
      </div>

      <div className="mentee-overview-mentor-footer">
        <span>
          {availableSpaces}{" "}
          {availableSpaces === 1
            ? "space"
            : "spaces"}{" "}
          available
        </span>

        <button
          type="button"
          onClick={onView}
        >
          View profile
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function getProfileCompletion(profile) {
  if (!profile) {
    return 0;
  }

  const checks = [
    Boolean(profile.biography?.trim()),
    Boolean(
      profile.mentorship_areas?.length,
    ),
    Boolean(
      profile.development_goals?.trim(),
    ),
    Boolean(
      profile.hopes_to_gain?.trim(),
    ),
    Boolean(profile.conduct_agreed),
    Boolean(profile.safety_agreed),
  ];

  const completed =
    checks.filter(Boolean).length;

  return Math.round(
    (completed / checks.length) * 100,
  );
}

function getMentorMatchScore(
  mentor,
  mentorshipAreas,
) {
  if (!mentorshipAreas.length) {
    return 0;
  }

  const mentorValues = [
    ...(mentor.mentorship_categories ??
      []),
    ...(mentor.expertise ?? []),
  ].map((value) =>
    String(value).toLowerCase(),
  );

  return mentorshipAreas.reduce(
    (score, area) => {
      const normalizedArea =
        String(area).toLowerCase();

      const matched =
        mentorValues.some(
          (value) =>
            value.includes(
              normalizedArea,
            ) ||
            normalizedArea.includes(
              value,
            ),
        );

      return score + (matched ? 1 : 0);
    },
    0,
  );
}

function getJourneyTitle({
  profileCompletion,
  activeRequest,
  nextSession,
}) {
  if (profileCompletion < 100) {
    return "Finish setting up your mentoring profile";
  }

  if (nextSession) {
    return "Prepare for your next mentoring session";
  }

  if (activeRequest) {
    return "Your mentorship request is in progress";
  }

  return "You are ready to find a mentor";
}

function formatStatus(value) {
  return String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
    },
  ).format(new Date(value));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  ).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export default MenteeDashboard;
