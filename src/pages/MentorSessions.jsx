import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Monitor,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorSessions.css";

function MentorSessions() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [sessionPage, setSessionPage] = useState(0);

  const today = useMemo(() => new Date(), []);

  const [selectedDate, setSelectedDate] = useState(
    formatDateInputValue(today),
  );

  const [calendarOpen, setCalendarOpen] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ),
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!calendarOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setCalendarOpen(false);
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
  }, [calendarOpen]);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: sessionError,
      } = await supabase.rpc(
        "get_my_mentor_sessions",
      );

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        console.error(
          "Unable to load mentor sessions:",
          sessionError.message,
        );

        setError(
          sessionError.message ||
            "We could not load your sessions. Please try again.",
        );

        setSessions([]);
        setLoading(false);
        return;
      }

      setSessions(data ?? []);
      setLoading(false);
    }

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const now = Date.now();

  const upcomingSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const sessionTime = new Date(
          session.scheduled_start,
        ).getTime();

        return (
          [
            "scheduled",
            "reschedule_requested",
          ].includes(session.status) &&
          sessionTime >= now
        );
      }),
    [sessions, now],
  );

  const pastSessions = useMemo(
    () =>
      sessions
        .filter((session) => {
          const sessionTime = new Date(
            session.scheduled_start,
          ).getTime();

          return (
            session.status === "completed" ||
            session.status === "cancelled" ||
            session.status === "no_show" ||
            sessionTime < now
          );
        })
        .sort(
          (first, second) =>
            new Date(second.scheduled_start) -
            new Date(first.scheduled_start),
        ),
    [sessions, now],
  );

  const displayedSessions =
    activeTab === "upcoming"
      ? upcomingSessions
      : pastSessions;

  const safeSessionPage = Math.min(
    sessionPage,
    Math.max(displayedSessions.length - 1, 0),
  );

  const currentSession =
    displayedSessions[safeSessionPage] ?? null;

  const sessionsForSelectedDate = useMemo(
    () =>
      sessions.filter((session) =>
        isSameCalendarDate(
          session.scheduled_start,
          selectedDate,
        ),
      ),
    [sessions, selectedDate],
  );

  const datesWithSessions = useMemo(
    () =>
      new Set(
        sessions.map((session) =>
          formatDateInputValue(
            new Date(
              session.scheduled_start,
            ),
          ),
        ),
      ),
    [sessions],
  );

  const calendarDays = useMemo(
    () =>
      buildCalendarDays(
        visibleMonth,
      ),
    [visibleMonth],
  );

  function changeSessionTab(tab) {
    setActiveTab(tab);
    setSessionPage(0);
  }

  function goToPreviousSession() {
    setSessionPage((current) =>
      Math.max(current - 1, 0),
    );
  }

  function goToNextSession() {
    setSessionPage((current) =>
      Math.min(
        current + 1,
        Math.max(
          displayedSessions.length - 1,
          0,
        ),
      ),
    );
  }

  function goToSessionPage(index) {
    setSessionPage(index);
  }

  function goToPreviousMonth() {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    );
  }

  function goToNextMonth() {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    );
  }

  function chooseDate(date) {
    setSelectedDate(
      formatDateInputValue(date),
    );

    setVisibleMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );

    setCalendarOpen(false);
  }

  function chooseToday() {
    const current = new Date();

    setSelectedDate(
      formatDateInputValue(current),
    );

    setVisibleMonth(
      new Date(
        current.getFullYear(),
        current.getMonth(),
        1,
      ),
    );

    setCalendarOpen(false);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="My sessions"
        description="View your upcoming and previous mentoring sessions."
      >
        <section className="mentor-sessions-summary">
          <div>
            <span className="mentor-sessions-eyebrow">
              YOUR MENTORING SCHEDULE
            </span>

            <h2>
              Keep your mentoring commitments in one place.
            </h2>

            <p>
              Upcoming sessions, meeting details and previous sessions will appear here.
            </p>
          </div>
        </section>

        <section className="mentor-session-workspace">
          <div className="mentor-session-main-column">
            <div className="mentor-session-loading-state">
              <article className="mentor-session-loading-card">
                <span className="mentor-session-loading-date" />

                <div>
                  <span className="mentor-session-loading-line mentor-session-loading-line--title" />
                  <span className="mentor-session-loading-line" />
                  <span className="mentor-session-loading-line mentor-session-loading-line--short" />
                </div>
              </article>
            </div>
          </div>

          <aside className="mentor-session-calendar-panel">
            <div className="mentor-session-calendar-heading">
              <span className="mentor-sessions-eyebrow">
                CHECK A DATE
              </span>

              <h3>
                View sessions for a specific day
              </h3>

              <p>
                Loading your mentoring schedule.
              </p>
            </div>

            <div className="mentor-session-calendar-loading">
              <span />
              <span />
              <span />
            </div>
          </aside>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="My sessions"
        description="View your upcoming and previous mentoring sessions."
      >
        <div
          className="mentor-session-inline-error"
          role="alert"
        >
          {error}
        </div>

        <section className="mentor-sessions-summary">
          <div>
            <span className="mentor-sessions-eyebrow">
              YOUR MENTORING SCHEDULE
            </span>

            <h2>
              Keep your mentoring commitments in one place.
            </h2>

            <p>
              Upcoming sessions, meeting details and previous sessions will appear here.
            </p>
          </div>
        </section>

        <section className="mentor-session-empty-state">
          <span className="empty-state-icon">
            <CalendarDays size={30} />
          </span>

          <h2>
            Unable to load your sessions
          </h2>

          <p>
            We could not load your mentoring schedule.
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
      title="My sessions"
      description="View your upcoming and previous mentoring sessions."
    >
      <section className="mentor-sessions-summary">
        <div>
          <span className="mentor-sessions-eyebrow">
            YOUR MENTORING SCHEDULE
          </span>

          <h2>
            Keep your mentoring commitments in one place.
          </h2>

          <p>
            Upcoming sessions, meeting details and previous sessions will appear here.
          </p>
        </div>
      </section>

      <div className="mentor-session-tabs">
        <button
          type="button"
          className={
            activeTab === "upcoming"
              ? "active"
              : ""
          }
          onClick={() =>
            changeSessionTab("upcoming")
          }
        >
          Upcoming
          <span>
            {upcomingSessions.length}
          </span>
        </button>

        <button
          type="button"
          className={
            activeTab === "past"
              ? "active"
              : ""
          }
          onClick={() =>
            changeSessionTab("past")
          }
        >
          Previous
          <span>
            {pastSessions.length}
          </span>
        </button>
      </div>

      <section
        className={`mentor-session-workspace ${
          displayedSessions.length === 0
            ? "mentor-session-workspace--empty"
            : ""
        }`}
      >
        <div className="mentor-session-main-column">
          {displayedSessions.length === 0 ? (
            <section className="mentor-session-empty-state">
              <span className="empty-state-icon">
                <CalendarDays size={30} />
              </span>

              <h2>
                {activeTab === "upcoming"
                  ? "No upcoming sessions"
                  : "No previous sessions"}
              </h2>

              <p>
                {activeTab === "upcoming"
                  ? "Once a mentorship request is accepted and a session is scheduled, it will appear here."
                  : "Completed, cancelled and missed mentoring sessions will appear here."}
              </p>
            </section>
          ) : (
            <div className="mentor-session-paged-shell">
              {currentSession && (
                <SessionCard
                  key={
                    currentSession.session_id
                  }
                  session={currentSession}
                  paginated
                />
              )}

              {displayedSessions.length > 1 && (
                <nav
                  className="mentor-session-pagination"
                  aria-label="Session pages"
                >
                  <button
                    type="button"
                    className="mentor-session-pagination-nav"
                    disabled={safeSessionPage === 0}
                    onClick={
                      goToPreviousSession
                    }
                  >
                    Previous
                  </button>

                  <div className="mentor-session-pagination-pages">
                    {displayedSessions.map(
                      (
                        session,
                        index,
                      ) => (
                        <button
                          key={
                            session.session_id
                          }
                          type="button"
                          aria-label={`Show session ${index + 1}`}
                          aria-current={
                            safeSessionPage ===
                            index
                              ? "page"
                              : undefined
                          }
                          className={
                            safeSessionPage ===
                            index
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            goToSessionPage(
                              index,
                            )
                          }
                        >
                          {index + 1}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    className="mentor-session-pagination-nav"
                    disabled={
                      safeSessionPage ===
                      displayedSessions.length -
                        1
                    }
                    onClick={
                      goToNextSession
                    }
                  >
                    Next
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>

        <aside className="mentor-session-calendar-panel">
          <div className="mentor-session-calendar-heading">
            <div>
              <span className="mentor-sessions-eyebrow">
                CHECK A DATE
              </span>

              <h3>
                View sessions for a specific day
              </h3>

              <p>
                Choose a date to see whether you have a mentoring session scheduled.
              </p>
            </div>
          </div>

          <div className="mentor-custom-date-field-wrap">
            <span className="mentor-custom-date-label">
              Select date
            </span>

            <button
              type="button"
              className="mentor-custom-date-field"
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
              onClick={() =>
                setCalendarOpen(
                  (current) => !current,
                )
              }
            >
              <span>
                {formatCompactDate(
                  selectedDate,
                )}
              </span>

              <CalendarDays size={17} />
            </button>

            {calendarOpen && (
              <div
                className="mentor-custom-calendar"
                role="dialog"
                aria-label="Choose session date"
              >
                <div className="mentor-custom-calendar-topbar">
                  <span>
                    Choose date
                  </span>

                  <button
                    type="button"
                    className="mentor-custom-calendar-close"
                    aria-label="Close calendar"
                    onClick={() =>
                      setCalendarOpen(
                        false,
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mentor-custom-calendar-header">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={
                      goToPreviousMonth
                    }
                  >
                    <ChevronLeft
                      size={18}
                    />
                  </button>

                  <strong>
                    {formatMonthYear(
                      visibleMonth,
                    )}
                  </strong>

                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={
                      goToNextMonth
                    }
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>
                </div>

                <div className="mentor-custom-calendar-weekdays">
                  {[
                    "Su",
                    "Mo",
                    "Tu",
                    "We",
                    "Th",
                    "Fr",
                    "Sa",
                  ].map((day) => (
                    <span key={day}>
                      {day}
                    </span>
                  ))}
                </div>

                <div className="mentor-custom-calendar-grid">
                  {calendarDays.map(
                    ({
                      key,
                      date,
                    }) => {
                      if (!date) {
                        return (
                          <span
                            key={key}
                            className="mentor-custom-calendar-empty-day"
                            aria-hidden="true"
                          />
                        );
                      }

                      const dateKey =
                        formatDateInputValue(
                          date,
                        );

                      const isSelected =
                        dateKey ===
                        selectedDate;

                      const isToday =
                        dateKey ===
                        formatDateInputValue(
                          new Date(),
                        );

                      const hasSession =
                        datesWithSessions.has(
                          dateKey,
                        );

                      return (
                        <button
                          key={key}
                          type="button"
                          className={[
                            "mentor-custom-calendar-day",
                            isSelected
                              ? "selected"
                              : "",
                            isToday
                              ? "today"
                              : "",
                            hasSession
                              ? "has-session"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            chooseDate(
                              date,
                            )
                          }
                          aria-label={
                            formatAccessibleDate(
                              date,
                            )
                          }
                          aria-pressed={
                            isSelected
                          }
                        >
                          <span>
                            {date.getDate()}
                          </span>

                          {hasSession && (
                            <i
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="secondary-button mentor-session-today-button"
            onClick={
              chooseToday
            }
          >
            Today
          </button>

          <div className="mentor-session-selected-date">
            <CalendarDays size={18} />

            <div>
              <small>
                Selected date
              </small>

              <strong>
                {formatSelectedDate(
                  selectedDate,
                )}
              </strong>
            </div>
          </div>

          {sessionsForSelectedDate.length ===
          0 ? (
            <div className="mentor-session-calendar-empty">
              <CalendarDays
                size={23}
              />

              <div>
                <h4>
                  No sessions on this date
                </h4>

                <p>
                  Choose another date to check your mentoring schedule.
                </p>
              </div>
            </div>
          ) : (
            <div className="mentor-session-calendar-results">
              {sessionsForSelectedDate.map(
                (session) => (
                  <SessionCalendarItem
                    key={
                      session.session_id
                    }
                    session={
                      session
                    }
                  />
                ),
              )}
            </div>
          )}
        </aside>
      </section>
    </DashboardLayout>
  );
}

function SessionCalendarItem({
  session,
}) {
  return (
    <article className="mentor-session-calendar-result">
      <span className="mentor-session-calendar-time">
        {formatSingleTime(
          session.scheduled_start,
        )}
      </span>

      <div>
        <strong>
          {session.mentee_name ||
            "Mentee"}
        </strong>

        <p>
          {session.mentoring_area ||
            "Mentorship session"}
        </p>
      </div>

      <span className="mentor-session-calendar-format">
        {session.meeting_format ===
        "virtual"
          ? "Virtual"
          : "In person"}
      </span>
    </article>
  );
}

function SessionCard({
  session,
  paginated = false,
}) {
  const menteeName =
    session.mentee_name ||
    "Mentee";

  const initials =
    menteeName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) =>
        name
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  const sessionStatus =
    String(
      session.status ||
        "scheduled",
    );

  const isVirtual =
    session.meeting_format ===
    "virtual";

  const canJoin =
    isVirtual &&
    session.meeting_link &&
    session.status ===
      "scheduled";

  return (
    <article
      className={[
        "mentor-session-card",
        paginated
          ? "mentor-session-card--paginated"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mentor-session-card-header">
        <div className="mentor-session-mentee">
          {session.profile_photo_url ? (
            <img
              src={
                session.profile_photo_url
              }
              alt=""
              className="mentor-session-avatar"
            />
          ) : (
            <span className="mentor-session-avatar mentor-session-initials">
              {initials || "MC"}
            </span>
          )}

          <div>
            <small>
              Session with
            </small>

            <h2>
              {menteeName}
            </h2>
          </div>
        </div>

        <span
          className={`mentor-session-status status-${sessionStatus.replaceAll(
            "_",
            "-",
          )}`}
        >
          {sessionStatus.replaceAll(
            "_",
            " ",
          )}
        </span>
      </div>

      <div className="mentor-session-date">
        <div className="mentor-session-date-badge">
          <span>
            {formatSessionMonth(
              session.scheduled_start,
            )}
          </span>

          <strong>
            {formatSessionDay(
              session.scheduled_start,
            )}
          </strong>
        </div>

        <div className="mentor-session-date-copy">
          <strong>
            {formatSessionWeekday(
              session.scheduled_start,
            )}
          </strong>

          <span>
            {formatSessionTimeRange(
              session.scheduled_start,
              session.scheduled_end,
            )}
          </span>

          <small>
            {formatSessionYear(
              session.scheduled_start,
            )}
          </small>
        </div>
      </div>

      <div className="mentor-session-information">
        <div>
          <Clock3 size={17} />

          <span>
            <small>
              Duration
            </small>

            <strong>
              {getDuration(
                session.scheduled_start,
                session.scheduled_end,
              )}
            </strong>
          </span>
        </div>

        <div>
          {isVirtual ? (
            <Monitor size={17} />
          ) : (
            <MapPin size={17} />
          )}

          <span>
            <small>
              Meeting format
            </small>

            <strong>
              {isVirtual
                ? "Virtual"
                : "In person"}
            </strong>
          </span>
        </div>
      </div>

      {session.mentoring_area && (
        <div className="mentor-session-topic">
          <small>
            Mentoring area
          </small>

          <p>
            {session.mentoring_area}
          </p>
        </div>
      )}

      {!isVirtual &&
        session.location_guidance && (
          <div className="mentor-session-location">
            <MapPin size={17} />

            <p>
              {
                session.location_guidance
              }
            </p>
          </div>
        )}

      <div className="mentor-session-actions">
        <span className="mentor-session-readonly-note">
          Session management will be added next.
        </span>

        {canJoin && (
          <a
            href={
              session.meeting_link
            }
            target="_blank"
            rel="noreferrer noopener"
            className="primary-button mentor-session-join-button"
          >
            Join meeting
            <ExternalLink
              size={16}
            />
          </a>
        )}
      </div>
    </article>
  );
}

function buildCalendarDays(
  visibleMonth,
) {
  const year =
    visibleMonth.getFullYear();

  const month =
    visibleMonth.getMonth();

  const firstDayOfMonth =
    new Date(
      year,
      month,
      1,
    );

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  const leadingEmptyDays =
    firstDayOfMonth.getDay();

  const emptyCells =
    Array.from(
      {
        length:
          leadingEmptyDays,
      },
      (
        _,
        index,
      ) => ({
        key: `empty-${index}`,
        date: null,
      }),
    );

  const monthDays =
    Array.from(
      {
        length:
          daysInMonth,
      },
      (
        _,
        index,
      ) => ({
        key: `${year}-${month}-${index + 1}`,
        date: new Date(
          year,
          month,
          index + 1,
        ),
      }),
    );

  return [
    ...emptyCells,
    ...monthDays,
  ];
}

function formatDateInputValue(
  date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function isSameCalendarDate(
  value,
  selectedDate,
) {
  return (
    formatDateInputValue(
      new Date(value),
    ) === selectedDate
  );
}

function dateFromKey(
  value,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatCompactDate(
  value,
) {
  if (!value) {
    return "Choose a date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    dateFromKey(value),
  );
}

function formatSelectedDate(
  value,
) {
  if (!value) {
    return "Choose a date";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    dateFromKey(value),
  );
}

function formatMonthYear(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      month: "long",
      year: "numeric",
    },
  ).format(value);
}

function formatAccessibleDate(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(value);
}

function formatSessionMonth(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      month: "short",
    },
  )
    .format(
      new Date(value),
    )
    .toUpperCase();
}

function formatSessionDay(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function formatSessionWeekday(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatSessionYear(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatSingleTime(
  value,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function formatSessionTimeRange(
  start,
  end,
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-NG",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );

  return `${formatter.format(
    new Date(start),
  )} – ${formatter.format(
    new Date(end),
  )}`;
}

function getDuration(
  start,
  end,
) {
  const minutes =
    Math.max(
      Math.round(
        (new Date(end) -
          new Date(start)) /
          60000,
      ),
      0,
    );

  return `${minutes} minutes`;
}

export default MentorSessions;
