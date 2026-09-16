import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
import "./MenteeRequestsTable.css";

const PENDING_STATUSES = [
  "pending",
  "clarification_requested",
];

const ACTIVE_STATUSES = [
  "accepted",
];

const WITHDRAWABLE_STATUSES = [
  "pending",
  "clarification_requested",
];

const CLOSED_STATUSES = [
  "declined",
  "referred",
  "withdrawn",
];

const REQUESTS_PER_PAGE = 8;

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
    currentPage,
    setCurrentPage,
  ] = useState(1);

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

  const [
    withdrawalReason,
    setWithdrawalReason,
  ] = useState("");

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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        displayedRequests.length /
          REQUESTS_PER_PAGE,
      ),
    );

  const paginatedRequests =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        REQUESTS_PER_PAGE;

      return displayedRequests.slice(
        start,
        start +
          REQUESTS_PER_PAGE,
      );
    }, [
      currentPage,
      displayedRequests,
    ]);

  async function confirmWithdraw() {
    if (!withdrawRequest) {
      return;
    }

    if (!user?.id) {
      return;
    }

    const reason =
      withdrawalReason.trim();

    if (!reason) {
      setError(
        "Please state why you are withdrawing this mentorship request.",
      );
      return;
    }

    setWithdrawing(true);
    setError("");

    const {
      error: withdrawError,
    } = await supabase.rpc(
      "withdraw_mentorship_request",
      {
        p_request_id:
          withdrawRequest.id,
        p_reason:
          reason,
      },
    );

    if (withdrawError) {
      console.error(
        "Unable to withdraw request:",
        withdrawError.message,
      );

      setError(
        withdrawError.message ||
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
    setWithdrawalReason("");

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
              Unable to load your requests
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
              No mentorship requests yet
            </h2>

            <p>
              When you send a mentorship request, the mentor
              and its status will appear here.
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
                  Your mentorship requests in one place.
                </h2>

                <p>
                  Only mentors you have already sent a request
                  to appear here. Use the filters to review
                  pending, active and closed requests.
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
                    No requests in this view
                  </h3>

                  <p>
                    Try another tab to see the rest of your
                    mentorship requests.
                  </p>
                </div>
              </section>
            ) : (
              <>
                <div className="mentee-request-table-wrapper">
                  <table className="mentee-request-table">
                    <thead>
                      <tr>
                        <th>Mentor</th>
                        <th>Mentoring area</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedRequests.map(
                        (request) => (
                          <RequestTableRow
                            key={
                              request.id
                            }
                            request={
                              request
                            }
                            onViewDetails={() =>
                              navigate(
                                `/mentee/requests/${request.id}`,
                              )
                            }
                            onViewMentor={() =>
                              navigate(
                                `/mentee/mentors/${request.mentor_id}`,
                              )
                            }
                            onMessages={() =>
                              navigate(
                                `/mentee/messages?mentor=${request.mentor_id}`,
                              )
                            }
                            onSessions={() =>
                              navigate(
                                "/mentee/sessions",
                              )
                            }
                            onWithdraw={() => {
                              setWithdrawalReason("");
                              setWithdrawRequest(
                                request,
                              );
                            }}
                          />
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <section className="mentee-request-mobile-list">
                  {paginatedRequests.map(
                    (request) => (
                      <RequestMobileCard
                        key={
                          request.id
                        }
                        request={
                          request
                        }
                        onViewDetails={() =>
                          navigate(
                            `/mentee/requests/${request.id}`,
                          )
                        }
                        onViewMentor={() =>
                          navigate(
                            `/mentee/mentors/${request.mentor_id}`,
                          )
                        }
                        onMessages={() =>
                          navigate(
                            `/mentee/messages?mentor=${request.mentor_id}`,
                          )
                        }
                        onSessions={() =>
                          navigate(
                            "/mentee/sessions",
                          )
                        }
                        onWithdraw={() => {
                          setWithdrawalReason("");
                          setWithdrawRequest(
                            request,
                          );
                        }}
                      />
                    ),
                  )}
                </section>

                {totalPages > 1 && (
                  <div className="mentee-request-pagination">
                    <button
                      type="button"
                      className="mentee-request-button mentee-request-button--secondary"
                      disabled={
                        currentPage === 1
                      }
                      onClick={() =>
                        setCurrentPage(
                          (
                            current,
                          ) =>
                            Math.max(
                              1,
                              current -
                                1,
                            ),
                        )
                      }
                    >
                      <ChevronLeft
                        size={15}
                      />
                      Previous
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="mentee-request-button mentee-request-button--secondary"
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      onClick={() =>
                        setCurrentPage(
                          (
                            current,
                          ) =>
                            Math.min(
                              totalPages,
                              current +
                                1,
                            ),
                        )
                      }
                    >
                      Next
                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                )}
              </>
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
                setWithdrawalReason("");
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
                  onClick={() => {
                    setWithdrawRequest(
                      null,
                    );
                    setWithdrawalReason("");
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              <h2 id="withdraw-request-title">
                Withdraw this mentorship request?
              </h2>

              <p>
                This will close your request to{" "}
                <strong>
                  {withdrawRequest
                    .mentor
                    ?.full_name ||
                    "this mentor"}
                </strong>
                . You can still find and request another
                mentor afterwards.
              </p>

              <label className="mentee-request-modal-reason">
                <span>
                  Reason for withdrawing *
                </span>

                <textarea
                  value={
                    withdrawalReason
                  }
                  rows={4}
                  placeholder="Tell the mentor why you are withdrawing this request."
                  onChange={(
                    event,
                  ) => {
                    setWithdrawalReason(
                      event.target
                        .value,
                    );

                    setError("");
                  }}
                />

                <small>
                  This reason will be visible to the mentor and kept in the request history.
                </small>
              </label>

              <div className="mentee-request-modal-actions">
                <button
                  type="button"
                  className="mentee-request-button mentee-request-button--secondary"
                  onClick={() => {
                    setWithdrawRequest(
                      null,
                    );
                    setWithdrawalReason("");
                  }}
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

function MentorIdentity({
  request,
}) {
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
    <div className="mentee-request-table-mentor">
      {request.mentor
        ?.profile_photo_url ? (
        <img
          src={
            request.mentor
              .profile_photo_url
          }
          alt=""
        />
      ) : (
        <span>
          {initials || "MC"}
        </span>
      )}

      <strong>
        {mentorName}
      </strong>
    </div>
  );
}

function RequestTableRow({
  request,
  onViewDetails,
  onViewMentor,
  onMessages,
  onSessions,
  onWithdraw,
}) {
  const status = String(
    request.status ||
      "pending",
  );

  return (
    <tr>
      <td>
        <MentorIdentity
          request={request}
        />
      </td>

      <td>
        {request.mentoring_area ||
          "Mentorship"}
      </td>

      <td>
        <RequestStatus
          status={status}
        />
      </td>

      <td>
        {formatDate(
          request.created_at,
        )}
      </td>

      <td>
        <div className="mentee-request-table-actions">
          <button
            type="button"
            className="mentee-request-table-link"
            onClick={
              onViewDetails
            }
          >
            View details
          </button>

          <button
            type="button"
            className="mentee-request-table-link"
            onClick={
              onViewMentor
            }
          >
            View mentor
          </button>

          {status ===
            "accepted" && (
            <>
              <button
                type="button"
                className="mentee-request-table-link is-message"
                onClick={
                  onMessages
                }
              >
                Message mentor
              </button>

              <button
                type="button"
                className="mentee-request-table-link"
                onClick={
                  onSessions
                }
              >
                Sessions
              </button>
            </>
          )}

          {WITHDRAWABLE_STATUSES.includes(
            status,
          ) && (
            <button
              type="button"
              className="mentee-request-table-link is-withdraw"
              onClick={
                onWithdraw
              }
            >
              Withdraw
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function RequestMobileCard({
  request,
  onViewDetails,
  onViewMentor,
  onMessages,
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

  return (
    <article className="mentee-request-mobile-card">
      <div className="mentee-request-mobile-card-top">
        <div>
          <small>
            REQUEST TO
          </small>

          <h3>
            {mentorName}
          </h3>

          <p>
            {request.mentoring_area ||
              "Mentorship"}
          </p>
        </div>

        <RequestStatus
          status={status}
        />
      </div>

      <div className="mentee-request-mobile-meta">
        <Clock3 size={14} />

        Submitted{" "}
        {formatDate(
          request.created_at,
        )}
      </div>

      <div className="mentee-request-mobile-actions">
        <button
          type="button"
          className="mentee-request-table-link"
          onClick={
            onViewDetails
          }
        >
          View details
        </button>

        <button
          type="button"
          className="mentee-request-table-link"
          onClick={
            onViewMentor
          }
        >
          <UserRound
            size={14}
          />
          View mentor
        </button>

        {status ===
          "accepted" && (
          <>
            <button
              type="button"
              className="mentee-request-table-link is-message"
              onClick={
                onMessages
              }
            >
              Message mentor
            </button>

            <button
              type="button"
              className="mentee-request-table-link"
              onClick={
                onSessions
              }
            >
              My sessions
              <ArrowRight
                size={14}
              />
            </button>
          </>
        )}

        {WITHDRAWABLE_STATUSES.includes(
          status,
        ) && (
          <button
            type="button"
            className="mentee-request-table-link is-withdraw"
            onClick={
              onWithdraw
            }
          >
            Withdraw
          </button>
        )}
      </div>
    </article>
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
    return "Recently";
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
