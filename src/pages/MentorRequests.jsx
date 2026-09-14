import {
  ChevronLeft,
  ChevronRight,
  GitPullRequest,
  Search,
  UserRound,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorRequests.css";

const REQUESTS_PER_PAGE = 8;

const FILTERS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "closed",
    label: "Closed",
  },
];

const ACTIVE_STATUSES = [
  "accepted",
  "clarification_requested",
];

const CLOSED_STATUSES = [
  "declined",
  "referred",
  "withdrawn",
];

function MentorRequests() {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

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
          mentee_id,
          mentor_id,
          mentoring_area,
          goal_statement,
          preferred_times,
          status,
          created_at,
          clarification_message,
          clarification_response,
          mentee:profiles!mentorship_requests_mentee_id_fkey (
            full_name,
            email,
            profile_photo_url
          )
        `)
        .eq(
          "mentor_id",
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
          "Unable to load mentor requests:",
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
    setCurrentPage(1);
  }, [
    activeFilter,
    searchTerm,
  ]);

  const filteredRequests =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const status =
            String(
              request.status ||
                "",
            );

          const matchesFilter =
            activeFilter ===
            "all"
              ? true
              : activeFilter ===
                  "pending"
                ? status ===
                  "pending"
                : activeFilter ===
                    "active"
                  ? ACTIVE_STATUSES.includes(
                      status,
                    )
                  : CLOSED_STATUSES.includes(
                      status,
                    );

          if (!matchesFilter) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          return [
            request.mentee
              ?.full_name,
            request.mentee
              ?.email,
            request
              .mentoring_area,
            request
              .goal_statement,
            request.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              searchValue,
            );
        },
      );
    }, [
      activeFilter,
      requests,
      searchTerm,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredRequests.length /
          REQUESTS_PER_PAGE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstIndex =
    (safePage - 1) *
    REQUESTS_PER_PAGE;

  const visibleRequests =
    filteredRequests.slice(
      firstIndex,
      firstIndex +
        REQUESTS_PER_PAGE,
    );

  const visibleStart =
    filteredRequests.length === 0
      ? 0
      : firstIndex + 1;

  const visibleEnd =
    Math.min(
      firstIndex +
        REQUESTS_PER_PAGE,
      filteredRequests.length,
    );

  const counts =
    useMemo(
      () => ({
        all: requests.length,
        pending:
          requests.filter(
            (request) =>
              request.status ===
              "pending",
          ).length,
        active:
          requests.filter(
            (request) =>
              ACTIVE_STATUSES.includes(
                String(
                  request.status,
                ),
              ),
          ).length,
        closed:
          requests.filter(
            (request) =>
              CLOSED_STATUSES.includes(
                String(
                  request.status,
                ),
              ),
          ).length,
      }),
      [requests],
    );

  if (loading) {
    return (
      <DashboardLayout
        title="Mentorship requests"
        description="Review and respond to requests from mentees."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading your mentorship requests
          </h2>

          <p>
            Please wait while we prepare your requests.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (
    error &&
    requests.length === 0
  ) {
    return (
      <DashboardLayout
        title="Mentorship requests"
        description="Review and respond to requests from mentees."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <GitPullRequest
              size={28}
            />
          </span>

          <h2>
            Unable to load requests
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mentorship requests"
      description="Review and respond to requests from mentees."
    >
      <div className="mentor-requests-page">
        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <section className="mentor-requests-toolbar">
          <div className="mentor-requests-search">
            <Search
              size={16}
              aria-hidden="true"
            />

            <input
              type="search"
              value={
                searchTerm
              }
              placeholder="Search mentee, mentoring area or goal"
              aria-label="Search mentorship requests"
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <span className="mentor-requests-count">
            {
              filteredRequests.length
            }{" "}
            {filteredRequests.length ===
            1
              ? "request"
              : "requests"}
          </span>
        </section>

        <div className="mentor-request-filter-tabs">
          {FILTERS.map(
            (filter) => (
              <button
                key={
                  filter.value
                }
                type="button"
                className={
                  activeFilter ===
                  filter.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    filter.value,
                  )
                }
              >
                {
                  filter.label
                }

                <span>
                  {
                    counts[
                      filter
                        .value
                    ]
                  }
                </span>
              </button>
            ),
          )}
        </div>

        {requests.length ===
        0 ? (
          <section className="mentor-requests-empty">
            <span className="empty-state-icon">
              <GitPullRequest
                size={28}
              />
            </span>

            <h2>
              No mentorship requests yet
            </h2>

            <p>
              When a mentee sends you a mentorship request, it will appear here for you to review.
            </p>
          </section>
        ) : filteredRequests.length ===
          0 ? (
          <section className="mentor-requests-empty">
            <span className="empty-state-icon">
              <Search
                size={28}
              />
            </span>

            <h2>
              No matching requests
            </h2>

            <p>
              Try another search term or request status.
            </p>
          </section>
        ) : (
          <>
            <section className="mentor-requests-table-shell">
              <div className="mentor-requests-table-scroll">
                <table className="mentor-requests-table">
                  <thead>
                    <tr>
                      <th>
                        Mentee
                      </th>
                      <th>
                        Mentoring area
                      </th>
                      <th>
                        Status
                      </th>
                      <th>
                        Submitted
                      </th>
                      <th
                        aria-label="Action"
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRequests.map(
                      (
                        request,
                      ) => (
                        <tr
                          key={
                            request.id
                          }
                        >
                          <td>
                            <MenteeIdentity
                              request={
                                request
                              }
                            />
                          </td>

                          <td>
                            <span className="mentor-request-area">
                              {request
                                .mentoring_area ||
                                "Not provided"}
                            </span>
                          </td>

                          <td>
                            <RequestStatus
                              value={
                                request.status
                              }
                            />
                          </td>

                          <td>
                            {formatDate(
                              request.created_at,
                            )}
                          </td>

                          <td className="mentor-request-action-cell">
                            <button
                              type="button"
                              className="mentor-request-view-button"
                              onClick={() =>
                                navigate(
                                  `/mentor/requests/${request.id}`,
                                )
                              }
                            >
                              View request
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mentor-requests-mobile-list">
                {visibleRequests.map(
                  (request) => (
                    <article
                      key={
                        request.id
                      }
                      className="mentor-request-mobile-card"
                    >
                      <div className="mentor-request-mobile-card-top">
                        <MenteeIdentity
                          request={
                            request
                          }
                        />

                        <RequestStatus
                          value={
                            request.status
                          }
                        />
                      </div>

                      <div className="mentor-request-mobile-detail">
                        <small>
                          Mentoring area
                        </small>

                        <strong>
                          {request
                            .mentoring_area ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div className="mentor-request-mobile-detail">
                        <small>
                          Submitted
                        </small>

                        <strong>
                          {formatDate(
                            request.created_at,
                          )}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="mentor-request-view-button"
                        onClick={() =>
                          navigate(
                            `/mentor/requests/${request.id}`,
                          )
                        }
                      >
                        View request
                      </button>
                    </article>
                  ),
                )}
              </div>

              <div className="mentor-request-pagination">
                <p>
                  Showing{" "}
                  {visibleStart}-
                  {visibleEnd} of{" "}
                  {
                    filteredRequests.length
                  }
                </p>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (
                          page,
                        ) =>
                          Math.max(
                            1,
                            page -
                              1,
                          ),
                      )
                    }
                    disabled={
                      safePage ===
                      1
                    }
                  >
                    <ChevronLeft
                      size={15}
                    />
                    Previous
                  </button>

                  <span>
                    Page{" "}
                    {safePage} of{" "}
                    {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (
                          page,
                        ) =>
                          Math.min(
                            totalPages,
                            page +
                              1,
                          ),
                      )
                    }
                    disabled={
                      safePage ===
                      totalPages
                    }
                  >
                    Next
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function MenteeIdentity({
  request,
}) {
  const name =
    request.mentee
      ?.full_name ||
    "Mentee";

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
      .join("") ||
    "MC";

  return (
    <div className="mentor-request-mentee">
      {request.mentee
        ?.profile_photo_url ? (
        <img
          src={
            request.mentee
              .profile_photo_url
          }
          alt=""
        />
      ) : (
        <span>
          {initials}
        </span>
      )}

      <div>
        <strong>
          {name}
        </strong>

        {request.mentee
          ?.email && (
          <small>
            {
              request
                .mentee
                .email
            }
          </small>
        )}
      </div>
    </div>
  );
}

function RequestStatus({
  value,
}) {
  const status =
    String(
      value ||
        "pending",
    );

  const label =
    {
      pending:
        "Pending",
      accepted:
        "Accepted",
      clarification_requested:
        "Clarification needed",
      declined:
        "Declined",
      referred:
        "Referred",
      withdrawn:
        "Withdrawn",
    }[status] ||
    status.replaceAll(
      "_",
      " ",
    );

  return (
    <span
      className={`mentor-request-status status-${status.replaceAll(
        "_",
        "-",
      )}`}
    >
      <i
        aria-hidden="true"
      />

      {label}
    </span>
  );
}

function formatDate(
  value,
) {
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
  ).format(
    new Date(value),
  );
}

export default MentorRequests;
