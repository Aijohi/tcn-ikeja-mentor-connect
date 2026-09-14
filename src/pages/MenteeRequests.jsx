import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  Clock3,
  GitPullRequest,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MenteeRequests.css";

const PENDING_STATUSES = [
  "pending",
];

const ACTIVE_STATUSES = [
  "accepted",
  "clarification_requested",
  "referred",
];

const WITHDRAWABLE_STATUSES = [
  "pending",
  "clarification_requested",
];

const CLOSED_STATUSES = [
  "declined",
  "withdrawn",
];

function MenteeRequests() {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    activeTab,
    setActiveTab,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    withdrawRequest,
    setWithdrawRequest,
  ] = useState(null);

  const [
    withdrawing,
    setWithdrawing,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: requestError,
      } = await supabase
        .from(
          "mentorship_requests",
        )
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
        .eq(
          "mentee_id",
          user.id,
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

      setRequests(
        data ?? [],
      );

      setLoading(false);
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!withdrawRequest) {
      return undefined;
    }

    function handleEscape(
      event,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setWithdrawRequest(
          null,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [withdrawRequest]);

  const pendingRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            PENDING_STATUSES.includes(
              String(
                request.status,
              ),
            ),
        ),
      [requests],
    );

  const activeRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            ACTIVE_STATUSES.includes(
              String(
                request.status,
              ),
            ),
        ),
      [requests],
    );

  const closedRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            CLOSED_STATUSES.includes(
              String(
                request.status,
              ),
            ),
        ),
      [requests],
    );

  const displayedRequests =
    useMemo(() => {
      if (
        activeTab ===
        "pending"
      ) {
        return pendingRequests;
      }

      if (
        activeTab ===
        "active"
      ) {
        return activeRequests;
      }

      if (
        activeTab ===
        "closed"
      ) {
        return closedRequests;
      }

      return requests;
    }, [
      activeTab,
      activeRequests,
      closedRequests,
      pendingRequests,
      requests,
    ]);

  async function confirmWithdraw() {
    if (!withdrawRequest) {
      return;
    }

    if (!user?.id) {
      return;
    }

    setWithdrawing(true);
    setError("");

    const {
      error: withdrawError,
    } = await supabase
      .from(
        "mentorship_requests",
      )
      .update({
        status: "withdrawn",
      })
      .eq(
        "id",
        withdrawRequest.id,
      )
      .eq(
        "mentee_id",
        user.id,
      );

    if (withdrawError) {
      console.error(
        "Unable to withdraw request:",
        withdrawError.message,
      );

      setError(
        "We could not withdraw this request. Please try again.",
      );

      setWithdrawing(false);
      return;
    }

    setRequests(
      (current) =>
        current.map(
          (request) =>
            request.id ===
            withdrawRequest.id
              ? {
                  ...request,
                  status:
                    "withdrawn",
                }
              : request,
        ),
    );

    setWithdrawRequest(
      null,
    );

    setWithdrawing(false);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="My requests"
        description="Track the mentorship requests you have sent."
      >
        <div className="mentee-requests-page">
          <section className="mentee-request-state">
            <div className="loader" />

            <h2>
              Loading your requests
            </h2>

            <p>
              Please wait while we
              prepare your mentorship
              request history.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    requests.length === 0
  ) {
    return (
      <DashboardLayout
        title="My requests"
        description="Track the mentorship requests you have sent."
      >
        <div className="mentee-requests-page">
          <section className="mentee-request-state">
            <span className="mentee-request-state-icon">
              <GitPullRequest
                size={24}
              />
            </span>

            <h2>
              Unable to load your
              requests
            </h2>

            <p>{error}</p>

            <button
              type="button"
              className="mentee-request-button mentee-request-button--primary"
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
      title="My requests"
      description="Track the mentorship requests you have sent."
    >
      <div className="mentee-requests-page">
        {error && (
          <div
            className="mentee-request-inline-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {requests.length ===
        0 ? (
          <section className="mentee-request-state mentee-request-empty">
            <span className="mentee-request-state-icon">
              <GitPullRequest
                size={24}
              />
            </span>

            <h2>
              No mentorship requests
              yet
            </h2>

            <p>
              When you request
              mentorship from an
              approved mentor, the
              request and its status
              will appear here.
            </p>

            <button
              type="button"
              className="mentee-request-button mentee-request-button--primary"
              onClick={() =>
                navigate(
                  "/mentee/find-mentor",
                )
              }
            >
              Find a mentor
            </button>
          </section>
        ) : (
          <>
            <section className="mentee-request-summary">
              <div>
                <span className="eyebrow">
                  REQUEST TRACKER
                </span>

                <h2>
                  Keep track of every
                  mentorship request.
                </h2>

                <p>
                  See what is waiting
                  for review, what
                  needs attention and
                  which connections
                  have moved forward.
                </p>
              </div>
            </section>

            <div
              className="mentee-request-tabs"
              role="tablist"
              aria-label="Filter mentorship requests"
            >
              <RequestTab
                label="All"
                value="all"
                activeTab={activeTab}
                count={requests.length}
                onChange={setActiveTab}
              />

              <RequestTab
                label="Pending"
                value="pending"
                activeTab={activeTab}
                count={
                  pendingRequests.length
                }
                onChange={setActiveTab}
              />

              <RequestTab
                label="Active"
                value="active"
                activeTab={activeTab}
                count={
                  activeRequests.length
                }
                onChange={setActiveTab}
              />

              <RequestTab
                label="Closed"
                value="closed"
                activeTab={activeTab}
                count={
                  closedRequests.length
                }
                onChange={setActiveTab}
              />
            </div>

            {displayedRequests.length ===
            0 ? (
              <section className="mentee-request-filter-empty">
                <Search size={22} />

                <div>
                  <h3>
                    No requests in
                    this view
                  </h3>

                  <p>
                    Try another tab
                    to see the rest
                    of your
                    mentorship
                    requests.
                  </p>
                </div>
              </section>
            ) : (
              <section className="mentee-request-list">
                {displayedRequests.map(
                  (request) => (
                    <RequestCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                      onViewMentor={() =>
                        navigate(
                          `/mentee/mentors/${request.mentor_id}`,
                        )
                      }
                      onSessions={() =>
                        navigate(
                          "/mentee/sessions",
                        )
                      }
                      onWithdraw={() =>
                        setWithdrawRequest(
                          request,
                        )
                      }
                    />
                  ),
                )}
              </section>
            )}
          </>
        )}

        {withdrawRequest && (
          <div
            className="mentee-request-modal-backdrop"
            role="presentation"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setWithdrawRequest(
                  null,
                );
              }
            }}
          >
            <section
              className="mentee-request-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="withdraw-request-title"
            >
              <div className="mentee-request-modal-top">
                <span>
                  WITHDRAW REQUEST
                </span>

                <button
                  type="button"
                  aria-label="Close withdraw request dialog"
                  onClick={() =>
                    setWithdrawRequest(
                      null,
                    )
                  }
                >
                  <X size={17} />
                </button>
              </div>

              <h2 id="withdraw-request-title">
                Withdraw this
                mentorship request?
              </h2>

              <p>
                This will close your
                request to{" "}
                <strong>
                  {withdrawRequest
                    .mentor
                    ?.full_name ||
                    "this mentor"}
                </strong>
                . You can still find
                and request another
                mentor afterwards.
              </p>

              <div className="mentee-request-modal-actions">
                <button
                  type="button"
                  className="mentee-request-button mentee-request-button--secondary"
                  onClick={() =>
                    setWithdrawRequest(
                      null,
                    )
                  }
                  disabled={
                    withdrawing
                  }
                >
                  Keep request
                </button>

                <button
                  type="button"
                  className="mentee-request-button mentee-request-button--danger"
                  onClick={
                    confirmWithdraw
                  }
                  disabled={
                    withdrawing
                  }
                >
                  {withdrawing
                    ? "Withdrawing..."
                    : "Withdraw request"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function RequestTab({
  label,
  value,
  activeTab,
  count,
  onChange,
}) {
  const isActive =
    activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={
        isActive
      }
      className={
        isActive
          ? "active"
          : ""
      }
      onClick={() =>
        onChange(value)
      }
    >
      {label}

      <span>{count}</span>
    </button>
  );
}

function RequestCard({
  request,
  onViewMentor,
  onSessions,
  onWithdraw,
}) {
  const status = String(
    request.status ||
      "pending",
  );

  const mentorName =
    request.mentor
      ?.full_name ||
    "Approved mentor";

  const initials =
    mentorName
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
    <article className="mentee-request-card">
      <div className="mentee-request-card-top">
        <div className="mentee-request-mentor">
          {request.mentor
            ?.profile_photo_url ? (
            <img
              src={
                request.mentor
                  .profile_photo_url
              }
              alt=""
              className="mentee-request-avatar"
            />
          ) : (
            <span className="mentee-request-avatar mentee-request-initials">
              {initials ||
                "MC"}
            </span>
          )}

          <div>
            <small>
              REQUEST TO
            </small>

            <h2>
              {mentorName}
            </h2>

            <p>
              {request.mentoring_area ||
                "Mentorship"}
            </p>
          </div>
        </div>

        <RequestStatus
          status={status}
        />
      </div>

      <div className="mentee-request-card-body">
        <div className="mentee-request-details">
          <RequestDetail
            label="YOUR GOAL"
            value={
              request.goal_statement ||
              "No goal statement was provided."
            }
          />

          {request.reason_for_choosing_mentor && (
            <RequestDetail
              label="WHY YOU CHOSE THIS MENTOR"
              value={
                request.reason_for_choosing_mentor
              }
            />
          )}

          {request.preferred_times && (
            <RequestDetail
              label="PREFERRED TIMES"
              value={
                request.preferred_times
              }
            />
          )}
        </div>

        <div className="mentee-request-meta">
          <span className="mentee-request-submitted">
            <Clock3 size={15} />

            Submitted{" "}
            {formatDate(
              request.created_at,
            )}
          </span>

          <StatusMessage
            status={status}
          />
        </div>
      </div>

      <div className="mentee-request-card-actions">
        <button
          type="button"
          className="mentee-request-text-button"
          onClick={
            onViewMentor
          }
        >
          <UserRound
            size={15}
          />

          View mentor
        </button>

        <div>
          {status ===
            "accepted" && (
            <button
              type="button"
              className="mentee-request-button mentee-request-button--primary"
              onClick={
                onSessions
              }
            >
              My sessions

              <ArrowRight
                size={15}
              />
            </button>
          )}

          {WITHDRAWABLE_STATUSES.includes(
            status,
          ) && (
            <button
              type="button"
              className="mentee-request-button mentee-request-button--withdraw"
              onClick={
                onWithdraw
              }
            >
              Withdraw request
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function RequestDetail({
  label,
  value,
}) {
  return (
    <div className="mentee-request-goal">
      <small>{label}</small>

      <p>{value}</p>
    </div>
  );
}

function RequestStatus({
  status,
}) {
  return (
    <span
      className={`mentee-request-status status-${status.replaceAll(
        "_",
        "-",
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function StatusMessage({
  status,
}) {
  const content = {
    pending: {
      title:
        "Waiting for mentor review",

      text:
        "The mentor has not responded yet.",
    },

    accepted: {
      title:
        "Request accepted",

      text:
        "You can continue to session scheduling.",
    },

    clarification_requested: {
      title:
        "More information needed",

      text:
        "The mentor needs clarification before making a decision.",
    },

    referred: {
      title:
        "Request referred",

      text:
        "Your request has been referred for matching support.",
    },

    declined: {
      title:
        "Request declined",

      text:
        "You can explore another approved mentor.",
    },

    withdrawn: {
      title:
        "Request withdrawn",

      text:
        "This request is no longer active.",
    },
  };

  const message =
    content[status] ?? {
      title:
        formatStatus(
          status,
        ),

      text:
        "Your request status has been updated.",
    };

  return (
    <span className="mentee-request-status-copy">
      <strong>
        {message.title}
      </strong>

      <small>
        {message.text}
      </small>
    </span>
  );
}

function formatStatus(value) {
  return String(
    value || "unknown",
  )
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function formatDate(value) {
  if (!value) {
    return "recently";
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

export default MenteeRequests;
