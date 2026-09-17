import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Quote,
  Star,
  Users,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorDashboard.css";
import "./MentorDashboardFeedback.css";

function MentorDashboard() {
  const { user, profile } = useAuth();

  const [mentorProfile, setMentorProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
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

      const now = new Date();

      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      const nextMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );

      const [
        mentorProfileResult,
        requestsResult,
        sessionsResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from("mentor_profiles")
          .select(`
            mentor_id,
            approval_status,
            accepting_requests,
            maximum_active_mentees,
            current_active_mentees
          `)
          .eq("mentor_id", user.id)
          .maybeSingle(),

        supabase
          .from("mentorship_requests")
          .select(`
            id,
            mentee_id,
            mentoring_area,
            status,
            created_at
          `)
          .eq("mentor_id", user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("mentorship_sessions")
          .select(`
            id,
            status,
            scheduled_start
          `)
          .eq("mentor_id", user.id)
          .gte(
            "scheduled_start",
            monthStart.toISOString(),
          )
          .lt(
            "scheduled_start",
            nextMonthStart.toISOString(),
          )
          .order("scheduled_start", {
            ascending: true,
          }),

        supabase
          .from("mentorship_reviews")
          .select(`
            id,
            session_id,
            mentee_id,
            rating,
            review_text,
            public_consent,
            public_approved,
            created_at,
            mentee:profiles!mentorship_reviews_mentee_id_fkey (
              full_name,
              profile_photo_url
            )
          `)
          .eq("mentor_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        mentorProfileResult.error ||
        requestsResult.error ||
        sessionsResult.error ||
        reviewsResult.error;

      if (firstError) {
        console.error(
          "Unable to load mentor dashboard:",
          firstError.message,
        );

        setError(
          "We could not load all of your mentor dashboard information. Please try again.",
        );

        setLoading(false);
        return;
      }

      setMentorProfile(
        mentorProfileResult.data ?? null,
      );

      setRequests(
        requestsResult.data ?? [],
      );

      setSessions(
        sessionsResult.data ?? [],
      );

      setReviews(
        reviewsResult.data ?? [],
      );

      setLoading(false);
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const displayName =
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Mentor";

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    "Mentor";

  const greeting =
    getGreeting();

  const pendingRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            String(
              request.status,
            ) === "pending",
        ),
      [requests],
    );

  const completedSessionsThisMonth =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            String(
              session.status,
            ) === "completed",
        ).length,
      [sessions],
    );


  const averageRating =
    useMemo(() => {
      if (reviews.length === 0) {
        return null;
      }

      const total =
        reviews.reduce(
          (sum, review) =>
            sum +
            Number(
              review.rating ?? 0,
            ),
          0,
        );

      return total / reviews.length;
    }, [reviews]);

  const maximumActiveMentees =
    Number(
      mentorProfile?.maximum_active_mentees ??
        0,
    );

  const currentActiveMentees =
    Number(
      mentorProfile?.current_active_mentees ??
        0,
    );

  const availableSpaces =
    Math.max(
      maximumActiveMentees -
        currentActiveMentees,
      0,
    );

  const acceptingRequests =
    mentorProfile?.accepting_requests ===
    true;

  const profileApproved =
    mentorProfile?.approval_status ===
    "approved";

  if (loading) {
    return (
      <DashboardLayout
        title="Overview"
        description="Your mentoring activity at a glance."
      >
        <div className="mentor-overview-page">
          <section className="dashboard-empty-state">
            <div className="loader" />

            <h2>
              Preparing your mentor overview
            </h2>

            <p>
              Please wait while we load your mentoring activity.
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
        description="Your mentoring activity at a glance."
      >
        <div className="mentor-overview-page">
          <section className="dashboard-empty-state">
            <h2>
              Unable to load your mentor overview
            </h2>

            <p>{error}</p>

            <button
              type="button"
              className="primary-button mentor-overview-button"
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
      title={`${greeting}, ${firstName}`}
      description="Your mentoring activity at a glance."
    >
      <div className="mentor-overview-page">
        <section className="mentor-overview-hero">
          <div className="mentor-overview-hero-copy">
            <span className="mentor-overview-eyebrow">
              MENTOR OVERVIEW
            </span>

            <h2>
              {getHeroTitle({
                profileApproved,
                acceptingRequests,
                pendingRequestsCount:
                  pendingRequests.length,
              })}
            </h2>

            <p>
              {getHeroDescription({
                profileApproved,
                acceptingRequests,
                availableSpaces,
                pendingRequestsCount:
                  pendingRequests.length,
              })}
            </p>
          </div>

          <div className="mentor-overview-availability">
            <span>
              AVAILABILITY
            </span>

            <strong>
              {acceptingRequests
                ? "Accepting requests"
                : "Not accepting requests"}
            </strong>

            <small>
              {maximumActiveMentees > 0
                ? `${availableSpaces} ${
                    availableSpaces === 1
                      ? "space"
                      : "spaces"
                  } available`
                : "Capacity not set yet"}
            </small>
          </div>
        </section>

        <section className="mentor-overview-stat-grid">
          <SummaryCard
            icon={<Users size={19} />}
            label="Active mentees"
            value={
              maximumActiveMentees > 0
                ? `${currentActiveMentees} of ${maximumActiveMentees}`
                : String(
                    currentActiveMentees,
                  )
            }
            helper={
              maximumActiveMentees > 0
                ? `${availableSpaces} ${
                    availableSpaces === 1
                      ? "space"
                      : "spaces"
                  } available`
                : "Capacity not set yet"
            }
          />

          <SummaryCard
            icon={
              <CalendarDays
                size={19}
              />
            }
            label="Sessions this month"
            value={String(
              completedSessionsThisMonth,
            )}
            helper={
              completedSessionsThisMonth ===
              1
                ? "1 completed session"
                : `${completedSessionsThisMonth} completed sessions`
            }
          />

          <SummaryCard
            icon={<Star size={19} />}
            label="Mentor rating"
            value={
              averageRating === null
                ? "Not rated yet"
                : `${averageRating.toFixed(
                    1,
                  )} / 5`
            }
            helper={
              reviews.length === 0
                ? "Ratings will appear after completed sessions"
                : `${reviews.length} ${
                    reviews.length === 1
                      ? "review"
                      : "reviews"
                  } received`
            }
          />
        </section>

        <section className="mentor-overview-request-panel">
          <div className="mentor-overview-request-heading">
            <span className="mentor-overview-eyebrow">
              MENTORSHIP REQUESTS
            </span>

            <span className="mentor-overview-pending-count">
              {pendingRequests.length}{" "}
              {pendingRequests.length === 1
                ? "pending"
                : "pending"}
            </span>
          </div>

          <h3>
            {pendingRequests.length > 0
              ? `${pendingRequests.length} ${
                  pendingRequests.length === 1
                    ? "request is"
                    : "requests are"
                } waiting for your review.`
              : "No new mentorship requests yet."}
          </h3>

          <p>
            {pendingRequests.length > 0
              ? "Your mentorship requests page will let you review each request and respond."
              : acceptingRequests
                ? "You are available for new mentorship requests. New requests will appear here when a mentee chooses you."
                : "You are not currently accepting new mentorship requests. We will add the availability control to your mentor profile next."}
          </p>
        </section>

        <section className="mentor-feedback-section">
          <div className="mentor-feedback-heading">
            <div>
              <span className="mentor-overview-eyebrow">
                MENTEE FEEDBACK
              </span>

              <h3>
                Feedback from your mentoring sessions
              </h3>

              <p>
                You can see every review submitted about your
                completed sessions, including lower ratings and
                constructive feedback.
              </p>
            </div>

            <span className="mentor-feedback-count">
              {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="mentor-feedback-empty">
              <Quote
                size={24}
                aria-hidden="true"
              />

              <div>
                <h4>
                  No feedback received yet
                </h4>

                <p>
                  Reviews will appear here after mentees submit
                  feedback for completed sessions.
                </p>
              </div>
            </div>
          ) : (
            <div className="mentor-feedback-list">
              {reviews.map(
                (review) => (
                  <MentorFeedbackCard
                    key={review.id}
                    review={review}
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

function MentorFeedbackCard({
  review,
}) {
  const menteeName =
    review.mentee?.full_name ||
    "Mentee";

  const rating =
    Math.max(
      1,
      Math.min(
        5,
        Number(
          review.rating ?? 1,
        ),
      ),
    );

  return (
    <article className="mentor-feedback-card">
      <div className="mentor-feedback-card-top">
        <div>
          <strong>
            {menteeName}
          </strong>

          <small>
            {formatReviewDate(
              review.created_at,
            )}
          </small>
        </div>

        <div
          className="mentor-feedback-stars"
          aria-label={`${rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map(
            (star) => (
              <Star
                key={star}
                size={14}
                fill={
                  star <= rating
                    ? "currentColor"
                    : "none"
                }
                aria-hidden="true"
              />
            ),
          )}
        </div>
      </div>

      <p>
        {review.review_text}
      </p>

      {review.public_approved && (
        <span className="mentor-feedback-public-badge">
          Approved for public testimonial
        </span>
      )}
    </article>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}) {
  return (
    <article className="mentor-overview-stat-card">
      <span className="mentor-overview-stat-icon">
        {icon}
      </span>

      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>

      <p>
        {helper}
      </p>
    </article>
  );
}

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getHeroTitle({
  profileApproved,
  acceptingRequests,
  pendingRequestsCount,
}) {
  if (!profileApproved) {
    return "Your mentor profile is still being prepared.";
  }

  if (pendingRequestsCount > 0) {
    return "You have new mentorship requests to review.";
  }

  if (!acceptingRequests) {
    return "Your mentor account is ready.";
  }

  return "You are ready to support your next mentee.";
}

function getHeroDescription({
  profileApproved,
  acceptingRequests,
  availableSpaces,
  pendingRequestsCount,
}) {
  if (!profileApproved) {
    return "Your mentor information will become available once your approved mentor profile is fully connected.";
  }

  if (pendingRequestsCount > 0) {
    return `${pendingRequestsCount} ${
      pendingRequestsCount === 1
        ? "mentorship request is"
        : "mentorship requests are"
    } currently waiting for your review.`;
  }

  if (!acceptingRequests) {
    return "You currently have available mentor capacity, but you are not accepting new requests.";
  }

  if (availableSpaces > 0) {
    return `You currently have ${availableSpaces} ${
      availableSpaces === 1
        ? "mentoring space"
        : "mentoring spaces"
    } available for new mentees.`;
  }

  return "Your active mentee capacity is currently full.";
}


function formatReviewDate(value) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
}

export default MentorDashboard;
