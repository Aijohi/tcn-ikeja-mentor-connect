import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  MessageCircle,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MentorRequests.css";

const ACTIONS = {
  accept: {
    eyebrow:
      "ACCEPT REQUEST",
    title:
      "Accept this mentorship request?",
    description:
      "The mentee will become one of your active mentees. Messaging and session planning can begin after acceptance.",
    button:
      "Accept request",
    requiresMessage:
      false,
    danger:
      false,
  },

  clarification: {
    eyebrow:
      "REQUEST CLARIFICATION",
    title:
      "What would you like the mentee to clarify?",
    description:
      "The request will pause until the mentee responds. Their reply returns the request to Pending.",
    button:
      "Send clarification request",
    requiresMessage:
      true,
    danger:
      false,
  },

  decline: {
    eyebrow:
      "DECLINE REQUEST",
    title:
      "Decline this mentorship request?",
    description:
      "The request will be closed. You can optionally leave a short explanation for the record.",
    button:
      "Decline request",
    requiresMessage:
      false,
    danger:
      true,
  },

  refer: {
    eyebrow:
      "REFER REQUEST",
    title:
      "Refer this request for matching support?",
    description:
      "The request will be marked as referred so the mentoring team can help the mentee find another suitable match.",
    button:
      "Refer request",
    requiresMessage:
      false,
    danger:
      false,
  },
};

function MentorRequestDetails() {
  const navigate =
    useNavigate();

  const {
    requestId,
  } = useParams();

  const { user } =
    useAuth();

  const [
    request,
    setRequest,
  ] = useState(null);

  const [
    menteeProfile,
    setMenteeProfile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    selectedAction,
    setSelectedAction,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      if (
        !user?.id ||
        !requestId
      ) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error:
          requestError,
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
          reason_for_choosing_mentor,
          preferred_times,
          status,
          clarification_message,
          clarification_response,
          clarification_requested_at,
          clarification_responded_at,
          created_at,
          mentee:profiles!mentorship_requests_mentee_id_fkey (
            full_name,
            email,
            profile_photo_url
          )
        `)
        .eq(
          "id",
          requestId,
        )
        .eq(
          "mentor_id",
          user.id,
        )
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (requestError) {
        console.error(
          "Unable to load mentor request:",
          requestError.message,
        );

        setError(
          "We could not load this mentorship request. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "This mentorship request could not be found.",
        );

        setLoading(false);
        return;
      }

      const {
        data:
          menteeData,
        error:
          menteeError,
      } = await supabase
        .from(
          "mentee_profiles",
        )
        .select(`
          mentee_id,
          biography,
          mentorship_areas,
          development_goals,
          hopes_to_gain,
          previous_mentoring_history,
          preferred_availability
        `)
        .eq(
          "mentee_id",
          data.mentee_id,
        )
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (menteeError) {
        console.error(
          "Unable to load mentee profile:",
          menteeError.message,
        );
      }

      setRequest(data);
      setMenteeProfile(
        menteeData ??
          null,
      );

      setLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [
    requestId,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !selectedAction
    ) {
      return undefined;
    }

    function handleEscape(
      event,
    ) {
      if (
        event.key ===
          "Escape" &&
        !processing
      ) {
        closeAction();
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
  }, [
    processing,
    selectedAction,
  ]);

  const statusKey =
    useMemo(
      () =>
        String(
          request?.status ||
            "pending",
        ),
      [
        request?.status,
      ],
    );

  const menteeName =
    request?.mentee
      ?.full_name ||
    "Mentee";

  const initials =
    menteeName
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

  async function refreshRequest() {
    const {
      data,
      error:
        refreshError,
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
        reason_for_choosing_mentor,
        preferred_times,
        status,
        clarification_message,
        clarification_response,
        clarification_requested_at,
        clarification_responded_at,
        created_at,
        mentee:profiles!mentorship_requests_mentee_id_fkey (
          full_name,
          email,
          profile_photo_url
        )
      `)
      .eq(
        "id",
        requestId,
      )
      .eq(
        "mentor_id",
        user.id,
      )
      .single();

    if (refreshError) {
      throw refreshError;
    }

    setRequest(data);
  }

  function openAction(
    action,
  ) {
    setSelectedAction(
      action,
    );

    setActionMessage("");

    setError("");
    setSuccess("");
  }

  function closeAction() {
    if (processing) {
      return;
    }

    setSelectedAction("");
    setActionMessage("");
  }

  async function submitAction() {
    if (
      !request?.id ||
      !selectedAction
    ) {
      return;
    }

    const information =
      ACTIONS[
        selectedAction
      ];

    if (
      information
        ?.requiresMessage &&
      !actionMessage.trim()
    ) {
      setError(
        "Please write the clarification you need from the mentee.",
      );
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const {
      error:
        actionError,
    } = await supabase.rpc(
      "mentor_review_mentorship_request",
      {
        p_request_id:
          request.id,
        p_action:
          selectedAction,
        p_message:
          actionMessage
            .trim() ||
          null,
      },
    );

    if (actionError) {
      console.error(
        "Unable to review mentorship request:",
        actionError.message,
      );

      setError(
        actionError.message ||
          "We could not update this mentorship request.",
      );

      setProcessing(false);
      return;
    }

    try {
      await refreshRequest();
    } catch (
      refreshError
    ) {
      console.error(
        refreshError,
      );

      window.location.reload();
      return;
    }

    const messages = {
      accept:
        "The mentorship request has been accepted.",
      clarification:
        "Your clarification request has been sent to the mentee.",
      decline:
        "The mentorship request has been declined.",
      refer:
        "The request has been referred for matching support.",
    };

    setSuccess(
      messages[
        selectedAction
      ] ||
        "The request has been updated.",
    );

    setSelectedAction("");
    setActionMessage("");
    setProcessing(false);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Request details"
        description="Review the mentee's request before responding."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading request details
          </h2>

          <p>
            Please wait while we prepare this mentorship request.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (
    error &&
    !request
  ) {
    return (
      <DashboardLayout
        title="Request details"
        description="Review the mentee's request before responding."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <GitPullRequest
              size={28}
            />
          </span>

          <h2>
            Unable to load this request
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                "/mentor/requests",
              )
            }
          >
            Back to requests
          </button>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request details"
      description="Review the mentee's request before responding."
    >
      <div className="mentor-request-detail-page">
        <button
          type="button"
          className="mentor-request-back"
          onClick={() =>
            navigate(
              "/mentor/requests",
            )
          }
        >
          <ArrowLeft
            size={16}
          />
          Back to requests
        </button>

        {success && (
          <p className="mentor-request-success">
            <CheckCircle2
              size={17}
            />
            {success}
          </p>
        )}

        {error &&
          request && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

        <section className="mentor-request-detail-hero">
          <div className="mentor-request-detail-person">
            {request.mentee
              ?.profile_photo_url ? (
              <img
                src={
                  request
                    .mentee
                    .profile_photo_url
                }
                alt=""
              />
            ) : (
              <span className="mentor-request-detail-avatar">
                {
                  initials
                }
              </span>
            )}

            <div>
              <span className="mentor-request-eyebrow">
                MENTEE
              </span>

              <h2>
                {
                  menteeName
                }
              </h2>

              {request
                .mentee
                ?.email && (
                <p>
                  {
                    request
                      .mentee
                      .email
                  }
                </p>
              )}
            </div>
          </div>

          <RequestStatus
            value={
              request.status
            }
          />
        </section>

        <section className="mentor-request-summary-grid">
          <SummaryItem
            icon={
              <BriefcaseBusiness
                size={18}
              />
            }
            label="Mentoring area"
            value={
              request.mentoring_area ||
              "Not provided"
            }
          />

          <SummaryItem
            icon={
              <CalendarDays
                size={18}
              />
            }
            label="Submitted"
            value={
              formatDateTime(
                request.created_at,
              )
            }
          />

          <SummaryItem
            icon={
              <Clock3
                size={18}
              />
            }
            label="Preferred times"
            value={
              request.preferred_times ||
              "No preference provided"
            }
          />
        </section>

        <section className="mentor-request-copy-grid">
          <article>
            <span>
              MENTORSHIP GOAL
            </span>

            <h3>
              What the mentee wants to achieve
            </h3>

            <p>
              {request.goal_statement ||
                "No goal statement was provided."}
            </p>
          </article>

          <article>
            <span>
              WHY THEY CHOSE YOU
            </span>

            <h3>
              Reason for this request
            </h3>

            <p>
              {request.reason_for_choosing_mentor ||
                "No reason was provided."}
            </p>
          </article>
        </section>

        <section className="mentor-request-profile-section">
          <div className="mentor-request-section-heading">
            <span>
              MENTEE PROFILE
            </span>

            <h2>
              Understand their mentoring needs
            </h2>

            <p>
              Review the mentee's profile before deciding whether this is a suitable mentoring match.
            </p>
          </div>

          {menteeProfile ? (
            <div className="mentor-request-profile-grid">
              <ProfileBlock
                label="Biography"
                value={
                  menteeProfile.biography
                }
              />

              <ProfileBlock
                label="Development goals"
                value={
                  menteeProfile.development_goals
                }
              />

              <ProfileBlock
                label="What they hope to gain"
                value={
                  menteeProfile.hopes_to_gain
                }
              />

              <ProfileBlock
                label="Preferred availability"
                value={
                  menteeProfile.preferred_availability ||
                  "Not provided"
                }
              />

              <ProfileBlock
                label="Previous mentoring experience"
                value={
                  menteeProfile.previous_mentoring_history ||
                  "Not provided"
                }
              />

              <div className="mentor-request-profile-block">
                <small>
                  MENTORSHIP AREAS
                </small>

                <div className="mentor-request-tags">
                  {(menteeProfile.mentorship_areas ??
                    []).length >
                  0 ? (
                    menteeProfile.mentorship_areas.map(
                      (
                        area,
                      ) => (
                        <span
                          key={
                            area
                          }
                        >
                          {
                            area
                          }
                        </span>
                      ),
                    )
                  ) : (
                    <p>
                      Not provided
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mentor-request-profile-unavailable">
              The mentee's extended profile is not available right now. You can still review the information included in this request.
            </p>
          )}
        </section>

        {statusKey ===
          "clarification_requested" && (
          <section className="mentor-request-clarification">
            <div>
              <span className="mentor-request-eyebrow">
                CLARIFICATION
              </span>

              <h3>
                Waiting for the mentee's response
              </h3>
            </div>

            <div>
              <small>
                Your question
              </small>

              <p>
                {request.clarification_message ||
                  "Clarification requested."}
              </p>
            </div>

            {request.clarification_response && (
              <div>
                <small>
                  Mentee response
                </small>

                <p>
                  {
                    request.clarification_response
                  }
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mentor-request-decision-section">
          <div>
            <span className="mentor-request-eyebrow">
              REQUEST DECISION
            </span>

            <h2>
              {getDecisionTitle(
                statusKey,
              )}
            </h2>

            <p>
              {getDecisionDescription(
                statusKey,
              )}
            </p>
          </div>

          {statusKey ===
            "pending" && (
            <div className="mentor-request-decision-actions">
              <button
                type="button"
                className="mentor-request-secondary-action"
                onClick={() =>
                  openAction(
                    "clarification",
                  )
                }
              >
                <MessageCircle
                  size={16}
                />
                Request clarification
              </button>

              <button
                type="button"
                className="mentor-request-secondary-action"
                onClick={() =>
                  openAction(
                    "refer",
                  )
                }
              >
                <UserRound
                  size={16}
                />
                Refer for matching
              </button>

              <button
                type="button"
                className="mentor-request-decline-action"
                onClick={() =>
                  openAction(
                    "decline",
                  )
                }
              >
                <XCircle
                  size={16}
                />
                Decline
              </button>

              <button
                type="button"
                className="mentor-request-accept-action"
                onClick={() =>
                  openAction(
                    "accept",
                  )
                }
              >
                <CheckCircle2
                  size={16}
                />
                Accept request
              </button>
            </div>
          )}

          {statusKey ===
            "accepted" && (
            <div className="mentor-request-decision-actions">
              <button
                type="button"
                className="mentor-request-secondary-action"
                onClick={() =>
                  navigate(
                    "/mentor/mentees",
                  )
                }
              >
                <UserRound
                  size={16}
                />
                View my mentees
              </button>

              <button
                type="button"
                className="mentor-request-secondary-action"
                onClick={() =>
                  navigate(
                    "/mentor/sessions",
                  )
                }
              >
                <CalendarDays
                  size={16}
                />
                Go to sessions
              </button>

              <button
                type="button"
                className="mentor-request-accept-action"
                onClick={() =>
                  navigate(
                    "/mentor/messages",
                  )
                }
              >
                <MessageCircle
                  size={16}
                />
                Messages
              </button>
            </div>
          )}
        </section>

        {selectedAction && (
          <ActionModal
            action={
              selectedAction
            }
            message={
              actionMessage
            }
            setMessage={
              setActionMessage
            }
            error={
              error
            }
            processing={
              processing
            }
            onClose={
              closeAction
            }
            onConfirm={
              submitAction
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function ActionModal({
  action,
  message,
  setMessage,
  error,
  processing,
  onClose,
  onConfirm,
}) {
  const information =
    ACTIONS[action];

  if (!information) {
    return null;
  }

  return (
    <div
      className="mentor-request-modal-backdrop"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !processing
        ) {
          onClose();
        }
      }}
    >
      <section
        className="mentor-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-request-modal-title"
      >
        <div className="mentor-request-modal-header">
          <div>
            <span>
              {
                information.eyebrow
              }
            </span>

            <h2 id="mentor-request-modal-title">
              {
                information.title
              }
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={
              onClose
            }
            disabled={
              processing
            }
          >
            <X
              size={18}
            />
          </button>
        </div>

        <p>
          {
            information.description
          }
        </p>

        {(information.requiresMessage ||
          action ===
            "decline" ||
          action ===
            "refer") && (
          <label>
            <span>
              {information.requiresMessage
                ? "Clarification question"
                : "Optional note"}
            </span>

            <textarea
              value={
                message
              }
              rows={4}
              placeholder={
                information.requiresMessage
                  ? "What additional information do you need from the mentee?"
                  : "Add a short note if helpful..."
              }
              onChange={(
                event,
              ) =>
                setMessage(
                  event.target
                    .value,
                )
              }
            />
          </label>
        )}

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mentor-request-modal-actions">
          <button
            type="button"
            className="mentor-request-secondary-action"
            onClick={
              onClose
            }
            disabled={
              processing
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className={
              information.danger
                ? "mentor-request-decline-action"
                : "mentor-request-accept-action"
            }
            onClick={
              onConfirm
            }
            disabled={
              processing
            }
          >
            {processing
              ? "Please wait..."
              : information.button}
          </button>
        </div>
      </section>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}) {
  return (
    <article className="mentor-request-summary-item">
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

function ProfileBlock({
  label,
  value,
}) {
  return (
    <article className="mentor-request-profile-block">
      <small>
        {label}
      </small>

      <p>
        {value ||
          "Not provided"}
      </p>
    </article>
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

function getDecisionTitle(
  status,
) {
  switch (status) {
    case "accepted":
      return "This mentorship request has been accepted.";

    case "clarification_requested":
      return "Waiting for the mentee to clarify their request.";

    case "declined":
      return "This mentorship request was declined.";

    case "referred":
      return "This request has been referred for matching support.";

    case "withdrawn":
      return "The mentee withdrew this request.";

    default:
      return "Choose how you would like to respond.";
  }
}

function getDecisionDescription(
  status,
) {
  switch (status) {
    case "accepted":
      return "The mentee is now part of your active mentoring relationships. You can continue to sessions and messaging.";

    case "clarification_requested":
      return "No further action is needed until the mentee responds. Their response will return the request to Pending.";

    case "declined":
      return "No further action is required for this request.";

    case "referred":
      return "The mentoring team can now support the mentee with finding another suitable match.";

    case "withdrawn":
      return "This request is closed and cannot be accepted.";

    default:
      return "Review the mentee's goal, reason for choosing you and profile before making a decision.";
  }
}

function formatDateTime(
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
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

export default MentorRequestDetails;
