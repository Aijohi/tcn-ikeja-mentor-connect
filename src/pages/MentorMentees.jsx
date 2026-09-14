import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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

import "./MentorMentees.css";

const PAGE_SIZE = 8;

function MentorMentees() {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    mentees,
    setMentees,
  ] = useState([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

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

    async function loadMentees() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: menteeError,
      } = await supabase.rpc(
        "get_my_active_mentees",
      );

      if (!isMounted) {
        return;
      }

      if (menteeError) {
        console.error(
          "Unable to load mentor mentees:",
          menteeError.message,
        );

        setError(
          menteeError.message ||
            "We could not load your mentees. Please try again.",
        );

        setMentees([]);
        setLoading(false);
        return;
      }

      setMentees(
        data ?? [],
      );

      setLoading(false);
    }

    loadMentees();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredMentees =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      if (!searchValue) {
        return mentees;
      }

      return mentees.filter(
        (mentee) =>
          [
            mentee.mentee_name,
            mentee.mentee_email,
            mentee.mentoring_area,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              searchValue,
            ),
      );
    }, [
      mentees,
      searchTerm,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredMentees.length /
          PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstIndex =
    (safePage - 1) *
    PAGE_SIZE;

  const visibleMentees =
    filteredMentees.slice(
      firstIndex,
      firstIndex +
        PAGE_SIZE,
    );

  const visibleStart =
    filteredMentees.length === 0
      ? 0
      : firstIndex + 1;

  const visibleEnd =
    Math.min(
      firstIndex +
        PAGE_SIZE,
      filteredMentees.length,
    );

  if (loading) {
    return (
      <DashboardLayout
        title="My mentees"
        description="View the mentees you are currently supporting."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading your mentees
          </h2>

          <p>
            Please wait while we prepare your active mentoring relationships.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (
    error &&
    mentees.length === 0
  ) {
    return (
      <DashboardLayout
        title="My mentees"
        description="View the mentees you are currently supporting."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <UserRound
              size={28}
            />
          </span>

          <h2>
            Unable to load your mentees
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
      title="My mentees"
      description="View the mentees you are currently supporting."
    >
      <div className="mentor-mentees-page">
        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {mentees.length ===
        0 ? (
          <section className="mentor-mentees-empty">
            <span className="empty-state-icon">
              <UserRound
                size={28}
              />
            </span>

            <h2>
              No active mentees yet
            </h2>

            <p>
              When you accept a mentorship request, the mentee will appear here.
            </p>
          </section>
        ) : (
          <>
            <section className="mentor-mentees-toolbar">
              <div className="mentor-mentees-search">
                <Search
                  size={16}
                  aria-hidden="true"
                />

                <input
                  type="search"
                  value={
                    searchTerm
                  }
                  placeholder="Search mentee or mentoring area"
                  aria-label="Search active mentees"
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

              <span>
                {
                  filteredMentees.length
                }{" "}
                {filteredMentees.length ===
                1
                  ? "mentee"
                  : "mentees"}
              </span>
            </section>

            {filteredMentees.length ===
            0 ? (
              <section className="mentor-mentees-empty">
                <span className="empty-state-icon">
                  <Search
                    size={28}
                  />
                </span>

                <h2>
                  No matching mentees
                </h2>

                <p>
                  Try another name or mentoring area.
                </p>
              </section>
            ) : (
              <section className="mentor-mentees-table-shell">
                <div className="mentor-mentees-table-scroll">
                  <table className="mentor-mentees-table">
                    <thead>
                      <tr>
                        <th>
                          Mentee
                        </th>
                        <th>
                          Mentoring area
                        </th>
                        <th>
                          Started
                        </th>
                        <th>
                          Next session
                        </th>
                        <th>
                          Status
                        </th>
                        <th
                          aria-label="Action"
                        />
                      </tr>
                    </thead>

                    <tbody>
                      {visibleMentees.map(
                        (
                          mentee,
                        ) => (
                          <tr
                            key={
                              mentee.request_id
                            }
                          >
                            <td>
                              <MenteeIdentity
                                mentee={
                                  mentee
                                }
                              />
                            </td>

                            <td>
                              <span className="mentor-mentee-area">
                                {mentee.mentoring_area ||
                                  "Not provided"}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                mentee.started_at,
                              )}
                            </td>

                            <td>
                              <NextSession
                                value={
                                  mentee.next_session_start
                                }
                              />
                            </td>

                            <td>
                              <span className="mentor-mentee-status">
                                <i
                                  aria-hidden="true"
                                />
                                Active
                              </span>
                            </td>

                            <td className="mentor-mentee-action-cell">
                              <button
                                type="button"
                                className="mentor-mentee-view-button"
                                onClick={() =>
                                  navigate(
                                    `/mentor/mentees/${mentee.request_id}`,
                                  )
                                }
                              >
                                View mentee
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mentor-mentees-mobile-list">
                  {visibleMentees.map(
                    (
                      mentee,
                    ) => (
                      <article
                        key={
                          mentee.request_id
                        }
                        className="mentor-mentee-mobile-card"
                      >
                        <div className="mentor-mentee-mobile-top">
                          <MenteeIdentity
                            mentee={
                              mentee
                            }
                          />

                          <span className="mentor-mentee-status">
                            <i
                              aria-hidden="true"
                            />
                            Active
                          </span>
                        </div>

                        <div className="mentor-mentee-mobile-grid">
                          <MobileDetail
                            label="Mentoring area"
                            value={
                              mentee.mentoring_area ||
                              "Not provided"
                            }
                          />

                          <MobileDetail
                            label="Started"
                            value={
                              formatDate(
                                mentee.started_at,
                              )
                            }
                          />

                          <MobileDetail
                            label="Next session"
                            value={
                              mentee.next_session_start
                                ? formatDateTime(
                                    mentee.next_session_start,
                                  )
                                : "Not scheduled"
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="mentor-mentee-view-button"
                          onClick={() =>
                            navigate(
                              `/mentor/mentees/${mentee.request_id}`,
                            )
                          }
                        >
                          View mentee
                        </button>
                      </article>
                    ),
                  )}
                </div>

                <div className="mentor-mentees-pagination">
                  <p>
                    Showing{" "}
                    {visibleStart}-
                    {visibleEnd} of{" "}
                    {
                      filteredMentees.length
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
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function MenteeIdentity({
  mentee,
}) {
  const name =
    mentee.mentee_name ||
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
    <div className="mentor-mentee-identity">
      {mentee.profile_photo_url ? (
        <img
          src={
            mentee.profile_photo_url
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

        {mentee.mentee_email && (
          <small>
            {
              mentee.mentee_email
            }
          </small>
        )}
      </div>
    </div>
  );
}

function NextSession({
  value,
}) {
  if (!value) {
    return (
      <span className="mentor-mentee-no-session">
        Not scheduled
      </span>
    );
  }

  return (
    <span className="mentor-mentee-next-session">
      <CalendarDays
        size={14}
      />

      {formatDateTime(
        value,
      )}
    </span>
  );
}

function MobileDetail({
  label,
  value,
}) {
  return (
    <div>
      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
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

function formatDateTime(
  value,
) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

export default MentorMentees;
