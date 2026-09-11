import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  MessageCircle,
  Search,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const statusContent = {
  pending: {
    label: "Pending",
    title: "Waiting for your mentor",
    message:
      "Your mentorship request has been sent. The mentor can review your profile and respond to your request.",
  },

  accepted: {
    label: "Accepted",
    title: "Your request was accepted",
    message:
      "You can now continue to session scheduling and messaging with your mentor.",
  },

  declined: {
    label: "Declined",
    title: "This request was declined",
    message:
      "The mentor was unable to accept this request. You can continue exploring other approved mentors.",
  },

  clarification_requested: {
    label: "Clarification needed",
    title: "Your mentor needs more information",
    message:
      "Review the mentor's question below and send a clear response. Your request will return to pending after you reply.",
  },

  referred: {
    label: "Referred",
    title: "Matching support is needed",
    message:
      "This request has been referred so the mentoring team can help you find a more suitable match.",
  },

  withdrawn: {
    label: "Withdrawn",
    title: "You withdrew this request",
    message:
      "This request is now part of your request history and no further action will be taken.",
  },
};

function MenteeRequestDetails() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [mentorProfile, setMentorProfile] = useState(null);
  const [session, setSession] = useState(null);

  const [clarificationResponse, setClarificationResponse] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showWithdrawConfirmation, setShowWithdrawConfirmation] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRequest() {
      if (!user?.id || !requestId) {
        return;
      }

      setLoading(true);
      setError("");

      const requestResult = await supabase
        .from("mentorship_requests")
        .select(
          `
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
            withdrawn_at,
            created_at,
            mentor:profiles!mentorship_requests_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `,
        )
        .eq("id", requestId)
        .eq("mentee_id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (requestResult.error) {
        console.error(
          "Unable to load mentorship request:",
          requestResult.error.message,
        );

        setError(
          "We could not load this mentorship request. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!requestResult.data) {
        setError(
          "This mentorship request could not be found.",
        );

        setLoading(false);
        return;
      }

      const loadedRequest = requestResult.data;

      const [mentorResult, sessionResult] =
        await Promise.all([
          supabase
            .from("mentor_profiles")
            .select(
              `
                mentor_id,
                job_title,
                organisation,
                expertise,
                mentorship_categories
              `,
            )
            .eq("mentor_id", loadedRequest.mentor_id)
            .maybeSingle(),

          supabase
            .from("mentorship_sessions")
            .select(
              `
                id,
                scheduled_start,
                scheduled_end,
                status
              `,
            )
            .eq("request_id", loadedRequest.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle(),
        ]);

      if (!isMounted) {
        return;
      }

      if (mentorResult.error) {
        console.error(
          "Unable to load mentor profile:",
          mentorResult.error.message,
        );
      }

      if (sessionResult.error) {
        console.error(
          "Unable to load linked session:",
          sessionResult.error.message,
        );
      }

      setRequest(loadedRequest);
      setMentorProfile(mentorResult.data ?? null);
      setSession(sessionResult.data ?? null);

      setClarificationResponse(
        loadedRequest.clarification_response ?? "",
      );

      setLoading(false);
    }

    loadRequest();

    return () => {
      isMounted = false;
    };
  }, [requestId, user?.id]);

  const statusKey = useMemo(
    () =>
      String(request?.status || "pending")
        .toLowerCase(),
    [request?.status],
  );

  const status =
    statusContent[statusKey] ?? {
      label: statusKey.replaceAll("_", " "),
      title: "Request updated",
      message:
        "This request has been updated. Review the information below for the latest status.",
    };

  const mentorName =
    request?.mentor?.full_name || "Mentor";

  const initials = mentorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) =>
      name.charAt(0).toUpperCase(),
    )
    .join("");

  async function refreshRequest() {
    if (!user?.id || !requestId) {
      return;
    }

    const { data, error: requestError } =
      await supabase
        .from("mentorship_requests")
        .select(
          `
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
            withdrawn_at,
            created_at,
            mentor:profiles!mentorship_requests_mentor_id_fkey (
              full_name,
              profile_photo_url
            )
          `,
        )
        .eq("id", requestId)
        .eq("mentee_id", user.id)
        .maybeSingle();

    if (requestError) {
      throw requestError;
    }

    if (!data) {
      throw new Error(
        "This mentorship request could not be found.",
      );
    }

    setRequest(data);
    setClarificationResponse(
      data.clarification_response ?? "",
    );
  }

  async function handleWithdraw() {
    if (!request?.id) {
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const { error: withdrawError } =
      await supabase.rpc(
        "withdraw_mentorship_request",
        {
          p_request_id: request.id,
        },
      );

    if (withdrawError) {
      console.error(
        "Unable to withdraw mentorship request:",
        withdrawError.message,
      );

      setError(
        withdrawError.message ||
          "We could not withdraw your request. Please try again.",
      );

      setProcessing(false);
      return;
    }

    try {
      await refreshRequest();

      setSuccess(
        "Your mentorship request has been withdrawn.",
      );

      setShowWithdrawConfirmation(false);
    } catch (refreshError) {
      console.error(refreshError);

      window.location.reload();
      return;
    }

    setProcessing(false);
  }

  async function handleClarificationSubmit(
    event,
  ) {
    event.preventDefault();

    const response =
      clarificationResponse.trim();

    if (!response) {
      setError(
        "Please write your response before submitting.",
      );
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const { error: responseError } =
      await supabase.rpc(
        "respond_to_mentorship_clarification",
        {
          p_request_id: request.id,
          p_response: response,
        },
      );

    if (responseError) {
      console.error(
        "Unable to respond to clarification:",
        responseError.message,
      );

      setError(
        responseError.message ||
          "We could not send your response. Please try again.",
      );

      setProcessing(false);
      return;
    }

    try {
      await refreshRequest();

      setSuccess(
        "Your response has been sent. The request is waiting for the mentor again.",
      );
    } catch (refreshError) {
      console.error(refreshError);

      window.location.reload();
      return;
    }

    setProcessing(false);
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Request details"
        description="Review your mentorship request and its current status."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>Loading request details</h2>

          <p>
            Please wait while we prepare this mentorship request.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (error && !request) {
    return (
      <DashboardLayout
        title="Request details"
        description="Review your mentorship request and its current status."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <GitPullRequest size={30} />
          </span>

          <h2>Unable to load this request</h2>

          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/mentee/requests")
            }
          >
            Back to my requests
          </button>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request details"
      description="Review your mentorship request and its current status."
    >
      <section className="mentee-request-detail-page">
        <button
          type="button"
          className="mentee-request-detail-back"
          onClick={() =>
            navigate("/mentee/requests")
          }
        >
          <ArrowLeft size={16} />
          Back to my requests
        </button>

        {success && (
          <p className="mentee-request-detail-success">
            <CheckCircle2 size={18} />
            {success}
          </p>
        )}

        {error && request && (
          <p className="form-error">{error}</p>
        )}

        <section className="mentee-request-detail-hero">
          <div className="mentee-request-detail-mentor">
            {request.mentor?.profile_photo_url ? (
              <img
                src={request.mentor.profile_photo_url}
                alt=""
                className="mentee-request-detail-avatar"
              />
            ) : (
              <span className="mentee-request-detail-avatar mentee-request-detail-initials">
                {initials || "MC"}
              </span>
            )}

            <div>
              <span className="eyebrow">
                REQUESTED MENTOR
              </span>

              <h2>{mentorName}</h2>

              <p>
                {[
                  mentorProfile?.job_title,
                  mentorProfile?.organisation,
                ]
                  .filter(Boolean)
                  .join(" · ") ||
                  "Approved Mentor Connect mentor"}
              </p>
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
        </section>

        <section
          className={`mentee-request-detail-status status-${statusKey.replaceAll(
            "_",
            "-",
          )}`}
        >
          <div>
            {statusKey === "accepted" ? (
              <CheckCircle2 size={22} />
            ) : statusKey === "declined" ||
              statusKey === "withdrawn" ? (
              <XCircle size={22} />
            ) : (
              <GitPullRequest size={22} />
            )}
          </div>

          <span>
            <small>CURRENT STATUS</small>
            <strong>{status.title}</strong>
            <p>{status.message}</p>
          </span>
        </section>

        <section className="mentee-request-detail-grid">
          <article className="mentee-request-detail-card">
            <span>
              <BriefcaseBusiness size={18} />
            </span>

            <div>
              <small>Mentoring area</small>
              <strong>
                {request.mentoring_area ||
                  "Not provided"}
              </strong>
            </div>
          </article>

          <article className="mentee-request-detail-card">
            <span>
              <CalendarDays size={18} />
            </span>

            <div>
              <small>Request sent</small>
              <strong>
                {formatDateTime(
                  request.created_at,
                )}
              </strong>
            </div>
          </article>

          <article className="mentee-request-detail-card">
            <span>
              <Clock3 size={18} />
            </span>

            <div>
              <small>Preferred times</small>
              <strong>
                {request.preferred_times ||
                  "No preference provided"}
              </strong>
            </div>
          </article>
        </section>

        <section className="mentee-request-detail-copy-card">
          <div>
            <small>YOUR GOAL</small>
            <h3>What you want to achieve</h3>
            <p>
              {request.goal_statement ||
                "No goal statement provided."}
            </p>
          </div>

          <div>
            <small>
              WHY YOU CHOSE THIS MENTOR
            </small>
            <h3>Your reason for the request</h3>
            <p>
              {request.reason_for_choosing_mentor ||
                "No reason was provided."}
            </p>
          </div>
        </section>

        {statusKey ===
          "clarification_requested" && (
          <section className="mentee-request-clarification-card">
            <div className="mentee-request-clarification-heading">
              <MessageCircle size={21} />

              <div>
                <span className="eyebrow">
                  CLARIFICATION NEEDED
                </span>

                <h3>
                  Respond to your mentor
                </h3>
              </div>
            </div>

            <div className="mentee-request-mentor-question">
              <small>Mentor's question</small>

              <p>
                {request.clarification_message ||
                  "Your mentor has asked for more information before deciding on this request."}
              </p>
            </div>

            <form
              onSubmit={
                handleClarificationSubmit
              }
            >
              <label>
                Your response
                <textarea
                  value={
                    clarificationResponse
                  }
                  onChange={(event) => {
                    setClarificationResponse(
                      event.target.value,
                    );

                    setError("");
                  }}
                  placeholder="Add the information your mentor needs..."
                  rows={5}
                />
              </label>

              <button
                type="submit"
                className="primary-button"
                disabled={processing}
              >
                <Send size={16} />
                {processing
                  ? "Sending..."
                  : "Send response"}
              </button>
            </form>
          </section>
        )}

        <section className="mentee-request-detail-actions-card">
          <div>
            <span className="eyebrow">
              NEXT STEP
            </span>

            <h3>
              {getNextStepTitle(
                statusKey,
                Boolean(session),
              )}
            </h3>

            <p>
              {getNextStepDescription(
                statusKey,
                Boolean(session),
              )}
            </p>
          </div>

          <div className="mentee-request-detail-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(
                  `/mentee/mentors/${request.mentor_id}`,
                )
              }
            >
              <UserRound size={16} />
              View mentor
            </button>

            {statusKey === "accepted" && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigate(
                      "/mentee/messages",
                    )
                  }
                >
                  <MessageCircle size={16} />
                  Message mentor
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    navigate(
                      "/mentee/sessions",
                    )
                  }
                >
                  <CalendarDays size={16} />
                  {session
                    ? "View session"
                    : "Go to sessions"}
                </button>
              </>
            )}

            {(statusKey === "declined" ||
              statusKey === "referred" ||
              statusKey === "withdrawn") && (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  navigate(
                    "/mentee/find-mentor",
                  )
                }
              >
                <Search size={16} />
                Find another mentor
              </button>
            )}

            {(statusKey === "pending" ||
              statusKey ===
                "clarification_requested") && (
              <button
                type="button"
                className="mentee-request-withdraw-button"
                onClick={() => {
                  setShowWithdrawConfirmation(
                    true,
                  );

                  setError("");
                  setSuccess("");
                }}
              >
                Withdraw request
              </button>
            )}
          </div>
        </section>

        {showWithdrawConfirmation && (
          <section className="mentee-request-withdraw-confirmation">
            <div>
              <span className="eyebrow">
                WITHDRAW REQUEST
              </span>

              <h3>
                Are you sure you want to withdraw this request?
              </h3>

              <p>
                The mentor will no longer be able to accept this request. You can still request mentorship again later.
              </p>
            </div>

            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowWithdrawConfirmation(
                    false,
                  )
                }
                disabled={processing}
              >
                Keep request
              </button>

              <button
                type="button"
                className="mentee-request-confirm-withdraw-button"
                onClick={handleWithdraw}
                disabled={processing}
              >
                {processing
                  ? "Withdrawing..."
                  : "Withdraw request"}
              </button>
            </div>
          </section>
        )}
      </section>
    </DashboardLayout>
  );
}

function getNextStepTitle(
  status,
  hasSession,
) {
  switch (status) {
    case "accepted":
      return hasSession
        ? "Your mentoring session is ready"
        : "Continue to your mentoring schedule";

    case "declined":
      return "Continue your mentor search";

    case "clarification_requested":
      return "Send the information your mentor needs";

    case "referred":
      return "Explore another suitable mentor";

    case "withdrawn":
      return "Start a new request when you are ready";

    default:
      return "Wait for your mentor's response";
  }
}

function getNextStepDescription(
  status,
  hasSession,
) {
  switch (status) {
    case "accepted":
      return hasSession
        ? "Open My sessions to see the scheduled meeting information."
        : "Your request is accepted. Session scheduling is the next step.";

    case "declined":
      return "You can review other approved mentors and send a new request.";

    case "clarification_requested":
      return "Once you respond, the request returns to pending so your mentor can review it again.";

    case "referred":
      return "Browse the mentor directory while the mentoring team supports the matching process.";

    case "withdrawn":
      return "This request is closed, but you can choose another mentor whenever you are ready.";

    default:
      return "No action is required right now. You can withdraw the request if your plans change.";
  }
}

function formatDateTime(value) {
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
  ).format(new Date(value));
}

export default MenteeRequestDetails;
