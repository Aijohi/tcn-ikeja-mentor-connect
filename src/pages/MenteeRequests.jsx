import { useEffect, useState } from "react";

import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  GitPullRequest,
  Search,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const statusContent = {
  pending: {
    label: "Pending",
    message:
      "Your request has been sent and is waiting for the mentor to respond.",
  },
  accepted: {
    label: "Accepted",
    message:
      "The mentor accepted your request. Session scheduling is the next step.",
  },
  declined: {
    label: "Declined",
    message:
      "The mentor was unable to accept this request. You can continue exploring other mentors.",
  },
  clarification_requested: {
    label: "Clarification needed",
    message:
      "The mentor needs more information before deciding on your request.",
  },
  referred: {
    label: "Referred",
    message:
      "Your request has been referred for matching support.",
  },
  withdrawn: {
    label: "Withdrawn",
    message:
      "You withdrew this mentorship request.",
  },
};

function MenteeRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const { data, error: requestError } = await supabase
        .from("mentorship_requests")
        .select(`
          id,
          mentor_id,
          mentoring_area,
          goal_statement,
          reason_for_choosing_mentor,
          preferred_times,
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
        });

      if (!isMounted) {
        return;
      }

      if (requestError) {
        console.error(
          "Unable to load mentorship requests:",
          requestError.message,
        );

        setError(
          "We could not load your mentorship requests. Please try again.",
        );

        setRequests([]);
        setLoading(false);
        return;
      }

      setRequests(data ?? []);
      setLoading(false);
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <DashboardLayout
        title="My requests"
        description="Track the mentorship requests you have sent."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>Loading your requests</h2>

          <p>
            Please wait while we prepare your mentorship request
            history.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="My requests"
        description="Track the mentorship requests you have sent."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <GitPullRequest size={30} />
          </span>

          <h2>Unable to load your requests</h2>

          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </section>
      </DashboardLayout>
    );
  }

  if (requests.length === 0) {
    return (
      <DashboardLayout
        title="My requests"
        description="Track the mentorship requests you have sent."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <Search size={30} />
          </span>

          <h2>No mentorship requests yet</h2>

          <p>
            When you request mentorship from an approved mentor,
            the request and its status will appear here.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/mentee/find-mentor")
            }
          >
            Find a mentor
          </button>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My requests"
      description="Track the mentorship requests you have sent."
    >
      <section className="mentee-requests-summary">
        <div>
          <span className="eyebrow">
            MENTORSHIP REQUESTS
          </span>

          <h2>
            Keep track of every request in one place.
          </h2>

          <p>
            You will see when a mentor accepts, declines or asks
            for more information.
          </p>
        </div>

        <span className="mentee-requests-count">
          {requests.length}{" "}
          {requests.length === 1
            ? "request"
            : "requests"}
        </span>
      </section>

      <section className="mentee-requests-grid">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onViewRequest={() =>
              navigate(
                `/mentee/requests/${request.id}`,
              )
            }
            onViewMentor={() =>
              navigate(
                `/mentee/mentors/${request.mentor_id}`,
              )
            }
          />
        ))}
      </section>
    </DashboardLayout>
  );
}

function RequestCard({
  request,
  onViewRequest,
  onViewMentor,
}) {
  const mentorName =
    request.mentor?.full_name || "Mentor";

  const initials = mentorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) =>
      name.charAt(0).toUpperCase(),
    )
    .join("");

  const statusKey =
    String(request.status || "pending")
      .toLowerCase();

  const status =
    statusContent[statusKey] ?? {
      label: statusKey.replaceAll("_", " "),
      message:
        "This request has been updated. Check back for the latest information.",
    };

  return (
    <article className="mentee-request-card">
      <div className="mentee-request-card-top">
        <div className="mentee-request-mentor">
          {request.mentor?.profile_photo_url ? (
            <img
              src={
                request.mentor.profile_photo_url
              }
              alt=""
              className="mentee-request-avatar"
            />
          ) : (
            <span className="mentee-request-avatar mentee-request-initials">
              {initials || "MC"}
            </span>
          )}

          <div>
            <small>Requested mentor</small>

            <h2>{mentorName}</h2>
          </div>
        </div>

        <span
          className={`mentee-request-status status-${statusKey.replaceAll(
            "_",
            "-",
          )}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mentee-request-status-copy">
        <p>{status.message}</p>
      </div>

      <div className="mentee-request-details">
        <div>
          <BriefcaseBusiness size={16} />

          <span>
            <small>Mentoring area</small>
            <strong>
              {request.mentoring_area ||
                "Not provided"}
            </strong>
          </span>
        </div>

        <div>
          <Clock3 size={16} />

          <span>
            <small>Requested</small>
            <strong>
              {formatDate(
                request.created_at,
              )}
            </strong>
          </span>
        </div>
      </div>

      <div className="mentee-request-section">
        <small>Your goal</small>

        <p>
          {request.goal_statement ||
            "No goal statement provided."}
        </p>
      </div>

      {request.reason_for_choosing_mentor && (
        <div className="mentee-request-section">
          <small>
            Why you chose this mentor
          </small>

          <p>
            {
              request.reason_for_choosing_mentor
            }
          </p>
        </div>
      )}

      {request.preferred_times && (
        <div className="mentee-request-section">
          <small>Preferred times</small>

          <p>{request.preferred_times}</p>
        </div>
      )}

      <div className="mentee-request-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onViewMentor}
        >
          View mentor
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={onViewRequest}
        >
          View request
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
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
  ).format(new Date(value));
}

export default MenteeRequests;
