import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Monitor,
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

import "./MentorScheduleSession.css";

function MentorScheduleSession() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mentees, setMentees] = useState([]);
  const [sessionLengths, setSessionLengths] =
    useState([30, 45, 60]);
  const [supportedFormats, setSupportedFormats] =
    useState(["virtual", "in_person"]);

  const [requestId, setRequestId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ),
  );
  const [existingSessions, setExistingSessions] = useState([]);
  const [duration, setDuration] = useState(45);
  const [meetingFormat, setMeetingFormat] =
    useState("virtual");
  const [meetingLink, setMeetingLink] = useState("");
  const [locationGuidance, setLocationGuidance] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] =
    useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const [
        menteesResult,
        profileResult,
        sessionsResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_my_active_mentees",
        ),

        supabase
          .from("mentor_profiles")
          .select(
            `
              session_lengths,
              meeting_formats
            `,
          )
          .eq("mentor_id", user.id)
          .maybeSingle(),

        supabase.rpc(
          "get_my_mentor_sessions",
        ),
      ]);

      if (!isMounted) {
        return;
      }

      if (menteesResult.error) {
        console.error(
          "Unable to load active mentees:",
          menteesResult.error.message,
        );

        setError(
          menteesResult.error.message ||
            "We could not load your active mentees.",
        );

        setLoading(false);
        return;
      }

      const loadedMentees =
        menteesResult.data ?? [];

      setMentees(loadedMentees);

      if (
        loadedMentees.length === 1
      ) {
        setRequestId(
          loadedMentees[0].request_id,
        );
      }

      if (!profileResult.error) {
        const lengths =
          profileResult.data
            ?.session_lengths;

        if (
          Array.isArray(lengths) &&
          lengths.length > 0
        ) {
          setSessionLengths(
            lengths,
          );

          if (
            !lengths.includes(
              duration,
            )
          ) {
            setDuration(
              lengths[0],
            );
          }
        }

        const formats =
          normaliseMeetingFormats(
            profileResult.data
              ?.meeting_formats,
          );

        if (
          formats.length > 0
        ) {
          setSupportedFormats(
            formats,
          );

          if (
            !formats.includes(
              meetingFormat,
            )
          ) {
            setMeetingFormat(
              formats[0],
            );
          }
        }
      } else {
        console.error(
          "Unable to load mentor session preferences:",
          profileResult.error.message,
        );
      }

      if (
        !sessionsResult.error
      ) {
        setExistingSessions(
          sessionsResult.data ??
            [],
        );
      } else {
        console.error(
          "Unable to load existing mentor sessions:",
          sessionsResult.error.message,
        );
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const selectedMentee =
    useMemo(
      () =>
        mentees.find(
          (mentee) =>
            mentee.request_id ===
            requestId,
        ) ?? null,
      [
        mentees,
        requestId,
      ],
    );

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          visibleMonth,
        ),
      [visibleMonth],
    );

  const availableTimeSlots =
    useMemo(
      () =>
        buildAvailableTimeSlots({
          selectedDate:
            sessionDate,
          durationMinutes:
            Number(duration),
          existingSessions,
        }),
      [
        sessionDate,
        duration,
        existingSessions,
      ],
    );

  const scheduledStart =
    useMemo(() => {
      if (
        !sessionDate ||
        !sessionTime
      ) {
        return null;
      }

      const value =
        new Date(
          `${sessionDate}T${sessionTime}`,
        );

      if (
        Number.isNaN(
          value.getTime(),
        )
      ) {
        return null;
      }

      return value;
    }, [
      sessionDate,
      sessionTime,
    ]);

  const scheduledEnd =
    useMemo(() => {
      if (!scheduledStart) {
        return null;
      }

      return new Date(
        scheduledStart.getTime() +
          Number(duration) *
            60 *
            1000,
      );
    }, [
      duration,
      scheduledStart,
    ]);

  async function handleCreateSession(
    event,
  ) {
    event.preventDefault();

    setError("");
    setCreatedSession(null);

    if (!requestId) {
      setError(
        "Please choose a mentee.",
      );
      return;
    }

    if (
      !scheduledStart ||
      scheduledStart.getTime() <=
        Date.now()
    ) {
      setError(
        "Please choose a future date and time.",
      );
      return;
    }

    if (
      meetingFormat ===
        "virtual" &&
      !meetingLink.trim()
    ) {
      setError(
        "Please add the virtual meeting link.",
      );
      return;
    }

    if (
      meetingFormat ===
        "in_person" &&
      !locationGuidance.trim()
    ) {
      setError(
        "Please add the meeting location.",
      );
      return;
    }

    setCreating(true);

    const {
      data,
      error: createError,
    } = await supabase.rpc(
      "create_mentorship_session",
      {
        p_request_id:
          requestId,
        p_scheduled_start:
          scheduledStart.toISOString(),
        p_duration_minutes:
          Number(duration),
        p_meeting_format:
          meetingFormat,
        p_meeting_link:
          meetingFormat ===
          "virtual"
            ? meetingLink.trim()
            : null,
        p_location_guidance:
          meetingFormat ===
          "in_person"
            ? locationGuidance.trim()
            : null,
      },
    );

    setCreating(false);

    if (createError) {
      console.error(
        "Unable to create mentorship session:",
        createError.message,
      );

      setError(
        createError.message ||
          "We could not create this session. Please try again.",
      );
      return;
    }

    setCreatedSession(data);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setSessionDate("");
    setSessionTime("");
    setMeetingLink("");
    setLocationGuidance("");
    setCreatedSession(null);
    setError("");
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Schedule session"
        description="Create a mentoring session for one of your active mentees."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Preparing session scheduling
          </h2>

          <p>
            Please wait while we load your active mentees.
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
        title="Schedule session"
        description="Create a mentoring session for one of your active mentees."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <CalendarDays
              size={30}
            />
          </span>

          <h2>
            Unable to prepare scheduling
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/mentor/sessions",
              )
            }
          >
            Back to sessions
          </button>
        </section>
      </DashboardLayout>
    );
  }

  if (
    mentees.length === 0
  ) {
    return (
      <DashboardLayout
        title="Schedule session"
        description="Create a mentoring session for one of your active mentees."
      >
        <button
          type="button"
          className="mentor-schedule-back"
          onClick={() =>
            navigate(
              "/mentor/sessions",
            )
          }
        >
          <ArrowLeft
            size={16}
          />
          Back to sessions
        </button>

        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <UserRound
              size={30}
            />
          </span>

          <h2>
            No active mentees yet
          </h2>

          <p>
            You can schedule a session after accepting a mentorship request.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/mentor/requests",
              )
            }
          >
            View mentorship requests
          </button>
        </section>
      </DashboardLayout>
    );
  }

  if (createdSession) {
    return (
      <DashboardLayout
        title="Schedule session"
        description="Create a mentoring session for one of your active mentees."
      >
        <section className="mentor-session-created-state">
          <span className="mentor-session-created-icon">
            <CheckCircle2
              size={30}
            />
          </span>

          <span className="mentor-schedule-eyebrow">
            SESSION CREATED
          </span>

          <h2>
            Your session with{" "}
            {selectedMentee?.mentee_name ||
              "your mentee"}{" "}
            is scheduled.
          </h2>

          <p>
            The session is now visible to both you and the mentee under My sessions.
          </p>

          <div className="mentor-session-created-summary">
            <SummaryItem
              icon={
                <CalendarDays
                  size={18}
                />
              }
              label="Date"
              value={
                formatDate(
                  scheduledStart,
                )
              }
            />

            <SummaryItem
              icon={
                <Clock3
                  size={18}
                />
              }
              label="Time"
              value={
                formatTimeRange(
                  scheduledStart,
                  scheduledEnd,
                )
              }
            />

            <SummaryItem
              icon={
                meetingFormat ===
                "virtual" ? (
                  <Monitor
                    size={18}
                  />
                ) : (
                  <MapPin
                    size={18}
                  />
                )
              }
              label="Meeting"
              value={
                meetingFormat ===
                "virtual"
                  ? "Virtual"
                  : "In person"
              }
            />
          </div>

          <div className="mentor-session-created-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={
                resetForm
              }
            >
              Schedule another
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(
                  "/mentor/sessions",
                )
              }
            >
              View my sessions
            </button>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Schedule session"
      description="Create a mentoring session for one of your active mentees."
    >
      <div className="mentor-schedule-session-page">
        <button
          type="button"
          className="mentor-schedule-back"
          onClick={() =>
            navigate(
              "/mentor/sessions",
            )
          }
        >
          <ArrowLeft
            size={16}
          />
          Back to sessions
        </button>

        <section className="mentor-schedule-intro">
          <div>
            <span className="mentor-schedule-eyebrow">
              NEW SESSION
            </span>

            <h2>
              Schedule time with your mentee.
            </h2>

            <p>
              Choose the mentee, date, time, duration and how the session will take place.
            </p>
          </div>

          <div className="mentor-schedule-provider-note">
            <CalendarDays
              size={20}
            />

            <div>
              <strong>
                Mentor Connect scheduling
              </strong>

              <p>
                This session will be saved in Mentor Connect. Calendly can be connected as an optional scheduling provider next.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <form
          className="mentor-schedule-form"
          onSubmit={
            handleCreateSession
          }
        >
          <section className="mentor-schedule-card">
            <div className="mentor-schedule-section-heading">
              <span>
                01
              </span>

              <div>
                <h3>
                  Choose mentee
                </h3>

                <p>
                  Only mentees from accepted mentorship relationships are available.
                </p>
              </div>
            </div>

            <label className="mentor-schedule-field">
              <span>
                Mentee
              </span>

              <div className="mentor-schedule-select-wrap">
                <select
                  value={
                    requestId
                  }
                  onChange={(
                    event,
                  ) => {
                    setRequestId(
                      event.target
                        .value,
                    );

                    setError("");
                  }}
                >
                  <option value="">
                    Select a mentee
                  </option>

                  {mentees.map(
                    (mentee) => (
                      <option
                        key={
                          mentee.request_id
                        }
                        value={
                          mentee.request_id
                        }
                      >
                        {mentee.mentee_name ||
                          "Mentee"}
                        {" · "}
                        {mentee.mentoring_area ||
                          "Mentorship"}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="mentor-schedule-select-icon"
                  aria-hidden="true"
                />
              </div>
            </label>

            {selectedMentee && (
              <div className="mentor-schedule-selected-mentee">
                <span>
                  {getInitials(
                    selectedMentee.mentee_name,
                  )}
                </span>

                <div>
                  <strong>
                    {selectedMentee.mentee_name ||
                      "Mentee"}
                  </strong>

                  <small>
                    {selectedMentee.mentoring_area ||
                      "Mentorship"}
                  </small>
                </div>
              </div>
            )}
          </section>

          <section className="mentor-schedule-card">
            <div className="mentor-schedule-section-heading">
              <span>
                02
              </span>

              <div>
                <h3>
                  Date and time
                </h3>

                <p>
                  Choose a date, then select one of your available time slots.
                </p>
              </div>
            </div>

            <div className="mentor-schedule-date-time-layout">
              <div className="mentor-schedule-calendar-block">
                <div className="mentor-schedule-calendar-header">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setVisibleMonth(
                        (
                          current,
                        ) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() -
                              1,
                            1,
                          ),
                      )
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
                    onClick={() =>
                      setVisibleMonth(
                        (
                          current,
                        ) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() +
                              1,
                            1,
                          ),
                      )
                    }
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>
                </div>

                <div className="mentor-schedule-calendar-weekdays">
                  {[
                    "Su",
                    "Mo",
                    "Tu",
                    "We",
                    "Th",
                    "Fr",
                    "Sa",
                  ].map(
                    (day) => (
                      <span key={day}>
                        {day}
                      </span>
                    ),
                  )}
                </div>

                <div className="mentor-schedule-calendar-grid">
                  {calendarDays.map(
                    ({
                      key,
                      date,
                    }) => {
                      if (!date) {
                        return (
                          <span
                            key={key}
                            className="mentor-schedule-calendar-empty"
                          />
                        );
                      }

                      const dateKey =
                        formatDateInputValue(
                          date,
                        );

                      const isSelected =
                        dateKey ===
                        sessionDate;

                      const isPast =
                        isDateBeforeToday(
                          date,
                        );

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={
                            isPast
                          }
                          className={[
                            "mentor-schedule-calendar-day",
                            isSelected
                              ? "selected"
                              : "",
                            isPast
                              ? "disabled"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            setSessionDate(
                              dateKey,
                            );
                            setSessionTime(
                              "",
                            );
                            setError("");
                          }}
                          aria-pressed={
                            isSelected
                          }
                        >
                          {date.getDate()}
                        </button>
                      );
                    },
                  )}
                </div>

                {sessionDate && (
                  <div className="mentor-schedule-selected-date">
                    <CalendarDays
                      size={16}
                    />
                    <span>
                      {formatLongDate(
                        sessionDate,
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="mentor-schedule-time-block">
                <span className="mentor-schedule-field-label">
                  Available times
                </span>

                {!sessionDate ? (
                  <div className="mentor-schedule-time-placeholder">
                    <Clock3
                      size={22}
                    />

                    <p>
                      Choose a date to see available times.
                    </p>
                  </div>
                ) : availableTimeSlots.length ===
                  0 ? (
                  <div className="mentor-schedule-time-placeholder">
                    <Clock3
                      size={22}
                    />

                    <p>
                      No available times for this date.
                    </p>
                  </div>
                ) : (
                  <div className="mentor-schedule-time-slots">
                    {availableTimeSlots.map(
                      (slot) => (
                        <button
                          key={
                            slot.value
                          }
                          type="button"
                          className={
                            sessionTime ===
                            slot.value
                              ? "active"
                              : ""
                          }
                          onClick={() => {
                            setSessionTime(
                              slot.value,
                            );
                            setError("");
                          }}
                        >
                          {
                            slot.label
                          }
                        </button>
                      ),
                    )}
                  </div>
                )}

                {sessionTime && (
                  <div className="mentor-schedule-selected-time">
                    <Clock3
                      size={16}
                    />
                    <span>
                      Selected time:{" "}
                      <strong>
                        {formatDisplayTime(
                          sessionTime,
                        )}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mentor-schedule-card">
            <div className="mentor-schedule-section-heading">
              <span>
                03
              </span>

              <div>
                <h3>
                  Duration
                </h3>

                <p>
                  Choose one of the session lengths configured on your mentor profile.
                </p>
              </div>
            </div>

            <div className="mentor-schedule-choice-row">
              {sessionLengths.map(
                (length) => (
                  <button
                    key={
                      length
                    }
                    type="button"
                    className={
                      Number(
                        duration,
                      ) ===
                      Number(
                        length,
                      )
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setDuration(
                        Number(
                          length,
                        ),
                      )
                    }
                  >
                    {length} min
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="mentor-schedule-card">
            <div className="mentor-schedule-section-heading">
              <span>
                04
              </span>

              <div>
                <h3>
                  Meeting format
                </h3>

                <p>
                  Choose whether this is a virtual or in-person session.
                </p>
              </div>
            </div>

            <div className="mentor-schedule-format-grid">
              {supportedFormats.includes(
                "virtual",
              ) && (
                <button
                  type="button"
                  className={
                    meetingFormat ===
                    "virtual"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setMeetingFormat(
                      "virtual",
                    );

                    setLocationGuidance(
                      "",
                    );

                    setError("");
                  }}
                >
                  <Monitor
                    size={20}
                  />

                  <span>
                    <strong>
                      Virtual
                    </strong>

                    <small>
                      Meet online using your meeting link.
                    </small>
                  </span>
                </button>
              )}

              {supportedFormats.includes(
                "in_person",
              ) && (
                <button
                  type="button"
                  className={
                    meetingFormat ===
                    "in_person"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setMeetingFormat(
                      "in_person",
                    );

                    setMeetingLink(
                      "",
                    );

                    setError("");
                  }}
                >
                  <MapPin
                    size={20}
                  />

                  <span>
                    <strong>
                      In person
                    </strong>

                    <small>
                      Meet at a physical location.
                    </small>
                  </span>
                </button>
              )}
            </div>

            {meetingFormat ===
            "virtual" ? (
              <label className="mentor-schedule-field mentor-schedule-format-field">
                <span>
                  Meeting link
                </span>

                <div className="mentor-schedule-input-with-icon">
                  <ExternalLink
                    size={16}
                  />

                  <input
                    type="url"
                    value={
                      meetingLink
                    }
                    placeholder="https://meet.google.com/... or https://zoom.us/..."
                    onChange={(
                      event,
                    ) => {
                      setMeetingLink(
                        event.target
                          .value,
                      );

                      setError("");
                    }}
                  />
                </div>

                <small>
                  For now, paste your Google Meet, Zoom or other virtual meeting link.
                </small>
              </label>
            ) : (
              <label className="mentor-schedule-field mentor-schedule-format-field">
                <span>
                  Meeting location
                </span>

                <div className="mentor-schedule-input-with-icon">
                  <MapPin
                    size={16}
                  />

                  <input
                    type="text"
                    value={
                      locationGuidance
                    }
                    placeholder="Add the venue or clear meeting instructions"
                    onChange={(
                      event,
                    ) => {
                      setLocationGuidance(
                        event.target
                          .value,
                      );

                      setError("");
                    }}
                  />
                </div>
              </label>
            )}
          </section>

          <section className="mentor-schedule-review">
            <div>
              <span className="mentor-schedule-eyebrow">
                REVIEW
              </span>

              <h3>
                Session summary
              </h3>

              <p>
                Check the details before creating the session.
              </p>
            </div>

            <div className="mentor-schedule-review-grid">
              <ReviewItem
                label="Mentee"
                value={
                  selectedMentee
                    ?.mentee_name ||
                  "Not selected"
                }
              />

              <ReviewItem
                label="Date"
                value={
                  scheduledStart
                    ? formatDate(
                        scheduledStart,
                      )
                    : "Not selected"
                }
              />

              <ReviewItem
                label="Time"
                value={
                  scheduledStart
                    ? formatTimeRange(
                        scheduledStart,
                        scheduledEnd,
                      )
                    : "Not selected"
                }
              />

              <ReviewItem
                label="Duration"
                value={`${duration} minutes`}
              />

              <ReviewItem
                label="Format"
                value={
                  meetingFormat ===
                  "virtual"
                    ? "Virtual"
                    : "In person"
                }
              />
            </div>

            <div className="mentor-schedule-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(
                    "/mentor/sessions",
                  )
                }
                disabled={
                  creating
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  creating
                }
              >
                <CalendarDays
                  size={16}
                />

                {creating
                  ? "Creating..."
                  : "Create session"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}) {
  return (
    <article className="mentor-session-created-item">
      <span>
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </article>
  );
}

function ReviewItem({
  label,
  value,
}) {
  return (
    <div className="mentor-schedule-review-item">
      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function normaliseMeetingFormats(
  values,
) {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return [
      "virtual",
      "in_person",
    ];
  }

  const result =
    new Set();

  values.forEach(
    (value) => {
      const cleaned =
        String(value)
          .trim()
          .toLowerCase();

      if (
        cleaned ===
          "virtual" ||
        cleaned ===
          "either"
      ) {
        result.add(
          "virtual",
        );
      }

      if (
        cleaned ===
          "in person" ||
        cleaned ===
          "in_person" ||
        cleaned ===
          "either"
      ) {
        result.add(
          "in_person",
        );
      }
    },
  );

  return [
    ...result,
  ];
}

function getInitials(
  value,
) {
  return String(
    value || "Mentee",
  )
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

function buildCalendarDays(
  visibleMonth,
) {
  const year =
    visibleMonth.getFullYear();

  const month =
    visibleMonth.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1,
    );

  const numberOfDays =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  const leading =
    Array.from(
      {
        length:
          firstDay.getDay(),
      },
      (
        _,
        index,
      ) => ({
        key:
          `empty-${index}`,
        date: null,
      }),
    );

  const days =
    Array.from(
      {
        length:
          numberOfDays,
      },
      (
        _,
        index,
      ) => ({
        key:
          `${year}-${month}-${index + 1}`,
        date:
          new Date(
            year,
            month,
            index + 1,
          ),
      }),
    );

  return [
    ...leading,
    ...days,
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

function isDateBeforeToday(
  date,
) {
  const today =
    new Date();

  const startOfToday =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

  const candidate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

  return (
    candidate <
    startOfToday
  );
}

function buildAvailableTimeSlots({
  selectedDate,
  durationMinutes,
  existingSessions,
}) {
  if (!selectedDate) {
    return [];
  }

  const [
    year,
    month,
    day,
  ] = selectedDate
    .split("-")
    .map(Number);

  const slots = [];

  /*
   * Temporary Mentor Connect availability window:
   * 8:00 AM to 8:00 PM in 30-minute increments.
   * Later Calendly can populate this same UI from real
   * availability without changing the page design.
   */
  for (
    let minutesFromMidnight =
      8 * 60;
    minutesFromMidnight <=
      20 * 60;
    minutesFromMidnight +=
      30
  ) {
    const hours =
      Math.floor(
        minutesFromMidnight /
          60,
      );

    const minutes =
      minutesFromMidnight %
      60;

    const start =
      new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
        0,
      );

    const end =
      new Date(
        start.getTime() +
          durationMinutes *
            60 *
            1000,
      );

    if (
      start.getTime() <=
      Date.now()
    ) {
      continue;
    }

    const overlaps =
      (
        existingSessions ??
        []
      ).some(
        (session) => {
          if (
            ![
              "scheduled",
              "reschedule_requested",
            ].includes(
              session.status,
            )
          ) {
            return false;
          }

          const existingStart =
            new Date(
              session.scheduled_start,
            );

          const existingEnd =
            new Date(
              session.scheduled_end,
            );

          return (
            existingStart <
              end &&
            existingEnd >
              start
          );
        },
      );

    if (overlaps) {
      continue;
    }

    slots.push({
      value:
        `${String(
          hours,
        ).padStart(
          2,
          "0",
        )}:${String(
          minutes,
        ).padStart(
          2,
          "0",
        )}`,
      label:
        formatSlotLabel(
          start,
        ),
    });
  }

  return slots;
}

function formatSlotLabel(
  date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function formatDisplayTime(
  value,
) {
  if (!value) {
    return "";
  }

  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  const sample =
    new Date();

  sample.setHours(
    hours,
    minutes,
    0,
    0,
  );

  return formatSlotLabel(
    sample,
  );
}

function formatMonthYear(
  date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatLongDate(
  value,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      month - 1,
      day,
    ),
  );
}

function getTodayInputValue() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function formatDate(
  value,
) {
  if (!value) {
    return "Not selected";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatTimeRange(
  start,
  end,
) {
  if (
    !start ||
    !end
  ) {
    return "Not selected";
  }

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
  )} - ${formatter.format(
    new Date(end),
  )}`;
}

export default MentorScheduleSession;
