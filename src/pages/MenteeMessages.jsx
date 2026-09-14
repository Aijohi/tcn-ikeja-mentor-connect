import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  HeartHandshake,
  MessageCircle,
  Send,
  X,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./MenteeMessages.css";

function MenteeMessages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [eligibleMentors, setEligibleMentors] =
    useState([]);

  const [threads, setThreads] = useState([]);

  const [selectedThreadId, setSelectedThreadId] =
    useState(null);

  const [messages, setMessages] = useState([]);

  const [messageBody, setMessageBody] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [
    startConversationOpen,
    setStartConversationOpen,
  ] = useState(false);

  const messagesHistoryRef = useRef(null);
  const composerRef = useRef(null);

  const requestedMentorId = useMemo(
    () =>
      new URLSearchParams(
        location.search,
      ).get("mentor"),
    [location.search],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMessagingData() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const {
        data: acceptedRequests,
        error: requestError,
      } = await supabase
        .from("mentorship_requests")
        .select(`
          id,
          mentor_id,
          mentoring_area,
          goal_statement,
          status,
          created_at,
          mentor:profiles!mentorship_requests_mentor_id_fkey (
            full_name,
            profile_photo_url
          )
        `)
        .eq("mentee_id", user.id)
        .eq("status", "accepted")
        .order("created_at", {
          ascending: false,
        });

      if (!isMounted) {
        return;
      }

      if (requestError) {
        console.error(
          "Unable to load accepted mentorships:",
          requestError.message,
        );

        setError(
          "We could not load your mentorship conversations. Please try again.",
        );

        setEligibleMentors([]);
        setThreads([]);
        setLoading(false);
        return;
      }

      const accepted = acceptedRequests ?? [];

      if (accepted.length === 0) {
        setEligibleMentors([]);
        setThreads([]);
        setSelectedThreadId(null);
        setLoading(false);
        return;
      }

      const preparedMentors = [];

      for (const request of accepted) {
        const {
          data: conversation,
          error: conversationError,
        } = await supabase.rpc(
          "ensure_mentorship_conversation",
          {
            p_request_id: request.id,
          },
        );

        if (conversationError) {
          console.error(
            `Unable to prepare conversation for request ${request.id}:`,
            conversationError.message,
          );

          continue;
        }

        const conversationId =
          getConversationId(conversation);

        if (!conversationId) {
          console.error(
            "Conversation was prepared but no conversation id was returned.",
          );

          continue;
        }

        preparedMentors.push({
          ...request,
          conversationId,
        });
      }

      if (!isMounted) {
        return;
      }

      setEligibleMentors(preparedMentors);

      const conversationIds =
        preparedMentors.map(
          (item) => item.conversationId,
        );

      let existingConversationIds =
        new Set();

      if (conversationIds.length > 0) {
        const {
          data: existingMessages,
          error: existingMessageError,
        } = await supabase
          .from("mentorship_messages")
          .select("conversation_id")
          .in(
            "conversation_id",
            conversationIds,
          );

        if (existingMessageError) {
          console.error(
            "Unable to determine existing message threads:",
            existingMessageError.message,
          );
        } else {
          existingConversationIds = new Set(
            (existingMessages ?? []).map(
              (message) =>
                message.conversation_id,
            ),
          );
        }
      }

      if (!isMounted) {
        return;
      }

      let preparedThreads =
        preparedMentors.filter(
          (item) =>
            existingConversationIds.has(
              item.conversationId,
            ),
        );

      const requestedMentor =
        requestedMentorId
          ? preparedMentors.find(
              (item) =>
                item.mentor_id ===
                requestedMentorId,
            )
          : null;

      if (requestedMentor) {
        const alreadyInThreads =
          preparedThreads.some(
            (item) =>
              item.conversationId ===
              requestedMentor.conversationId,
          );

        if (!alreadyInThreads) {
          preparedThreads = [
            requestedMentor,
            ...preparedThreads,
          ];
        }

        setSelectedThreadId(
          requestedMentor.conversationId,
        );
      } else {
        setSelectedThreadId(
          (current) => {
            if (
              current &&
              preparedThreads.some(
                (thread) =>
                  thread.conversationId ===
                  current,
              )
            ) {
              return current;
            }

            return (
              preparedThreads[0]
                ?.conversationId ?? null
            );
          },
        );
      }

      setThreads(preparedThreads);
      setLoading(false);
    }

    loadMessagingData();

    return () => {
      isMounted = false;
    };
  }, [
    user?.id,
    requestedMentorId,
  ]);

  useEffect(() => {
    if (
      !selectedThreadId ||
      !user?.id
    ) {
      setMessages([]);
      return undefined;
    }

    let isMounted = true;

    async function loadMessages() {
      setLoadingMessages(true);
      setError("");

      const {
        data,
        error: messageError,
      } = await supabase
        .from("mentorship_messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          recipient_id,
          body,
          read_at,
          created_at
        `)
        .eq(
          "conversation_id",
          selectedThreadId,
        )
        .order("created_at", {
          ascending: true,
        });

      if (!isMounted) {
        return;
      }

      if (messageError) {
        console.error(
          "Unable to load messages:",
          messageError.message,
        );

        setError(
          "We could not load this conversation.",
        );

        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      setMessages(data ?? []);
      setLoadingMessages(false);

      const {
        error: readError,
      } = await supabase.rpc(
        "mark_mentorship_messages_read",
        {
          p_conversation_id:
            selectedThreadId,
        },
      );

      if (readError) {
        console.error(
          "Unable to mark messages as read:",
          readError.message,
        );
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [
    selectedThreadId,
    user?.id,
  ]);

  useEffect(() => {
    const history =
      messagesHistoryRef.current;

    if (!history) {
      return;
    }

    requestAnimationFrame(() => {
      history.scrollTop =
        history.scrollHeight;
    });
  }, [
    messages,
    loadingMessages,
    selectedThreadId,
  ]);

  useEffect(() => {
    if (!startConversationOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(event) {
      if (
        event.key === "Escape"
      ) {
        setStartConversationOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [startConversationOpen]);

  const selectedThread = useMemo(
    () =>
      threads.find(
        (thread) =>
          thread.conversationId ===
          selectedThreadId,
      ) ?? null,
    [
      threads,
      selectedThreadId,
    ],
  );

  function openConversation(
    mentorConnection,
  ) {
    if (!mentorConnection) {
      return;
    }

    setThreads((current) => {
      const alreadyExists =
        current.some(
          (thread) =>
            thread.conversationId ===
            mentorConnection.conversationId,
        );

      if (alreadyExists) {
        return current;
      }

      return [
        mentorConnection,
        ...current,
      ];
    });

    setSelectedThreadId(
      mentorConnection.conversationId,
    );

    setStartConversationOpen(false);
    setError("");
    setMessageBody("");

    if (composerRef.current) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function handleMessageChange(event) {
    const textarea =
      event.target;

    setMessageBody(
      textarea.value,
    );

    setError("");

    textarea.style.height =
      "44px";

    const nextHeight =
      Math.min(
        Math.max(
          textarea.scrollHeight,
          44,
        ),
        96,
      );

    textarea.style.height =
      `${nextHeight}px`;
  }

  async function handleSendMessage(
    event,
  ) {
    event.preventDefault();

    const trimmedMessage =
      messageBody.trim();

    if (
      !selectedThreadId ||
      !trimmedMessage ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const {
      data,
      error: sendError,
    } = await supabase.rpc(
      "send_mentorship_message",
      {
        p_conversation_id:
          selectedThreadId,
        p_body: trimmedMessage,
      },
    );

    setSending(false);

    if (sendError) {
      console.error(
        "Unable to send message:",
        sendError.message,
      );

      setError(
        sendError.message ||
          "We could not send your message.",
      );

      return;
    }

    if (data) {
      setMessages((current) => {
        const alreadyExists =
          current.some(
            (message) =>
              message.id === data.id,
          );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          data,
        ];
      });
    }

    setMessageBody("");

    if (composerRef.current) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function viewMentor(
    mentorId,
  ) {
    if (!mentorId) {
      return;
    }

    navigate(
      `/mentee/mentors/${mentorId}`,
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentors after your mentorship request has been accepted."
      >
        <div className="mentee-messages-page">
          <section className="mentee-message-loading-page">
            <span className="mentee-message-loading-block mentee-message-loading-block--short" />
            <span className="mentee-message-loading-block" />
            <span className="mentee-message-loading-block" />
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    eligibleMentors.length === 0
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentors after your mentorship request has been accepted."
      >
        <div className="mentee-messages-page">
          <section className="mentee-message-page-empty">
            <span className="mentee-message-page-empty-icon">
              <MessageCircle
                size={27}
              />
            </span>

            <h2>
              Unable to load messages
            </h2>

            <p>{error}</p>

            <button
              type="button"
              className="mentee-message-primary-button"
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

  if (
    eligibleMentors.length === 0
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentors after your mentorship request has been accepted."
      >
        <div className="mentee-messages-page">
          <section className="mentee-message-page-empty">
            <span className="mentee-message-page-empty-icon">
              <HeartHandshake
                size={28}
              />
            </span>

            <h2>
              Messaging unlocks after acceptance
            </h2>

            <p>
              Once a mentor accepts your
              mentorship request, you can
              start a conversation with that
              mentor here.
            </p>

            <button
              type="button"
              className="mentee-message-primary-button"
              onClick={() =>
                navigate(
                  "/mentee/requests",
                )
              }
            >
              View my requests
            </button>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Messages"
      description="Chat with mentors after your mentorship request has been accepted."
    >
      <div className="mentee-messages-page">
        <div className="mentee-message-page-toolbar">
          <div>
            <span className="mentee-message-toolbar-eyebrow">
              MENTOR MESSAGES
            </span>

            <p>
              Continue a conversation or
              start one with an eligible
              mentor.
            </p>
          </div>

          <button
            type="button"
            className="mentee-message-start-button"
            onClick={() =>
              setStartConversationOpen(
                true,
              )
            }
          >
            Start conversation
          </button>
        </div>

        <section className="mentee-messages-layout">
          <aside className="mentee-message-threads">
            <div className="mentee-message-threads-heading">
              <span className="eyebrow">
                CONVERSATIONS
              </span>

              <h2>Mentors</h2>
            </div>

            {threads.length === 0 ? (
              <div className="mentee-message-empty-list">
                <MessageCircle
                  size={24}
                />

                <h3>
                  No conversations yet
                </h3>

                <p>
                  Start a conversation with
                  a mentor from an accepted
                  mentorship.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setStartConversationOpen(
                      true,
                    )
                  }
                >
                  Start conversation
                </button>
              </div>
            ) : (
              <div className="mentee-message-thread-list">
                {threads.map(
                  (thread) => (
                    <MessageThreadButton
                      key={
                        thread.conversationId
                      }
                      thread={
                        thread
                      }
                      active={
                        thread.conversationId ===
                        selectedThreadId
                      }
                      onClick={() => {
                        setSelectedThreadId(
                          thread.conversationId,
                        );

                        setMessageBody(
                          "",
                        );

                        if (
                          composerRef.current
                        ) {
                          composerRef.current.style.height =
                            "44px";
                        }
                      }}
                    />
                  ),
                )}
              </div>
            )}
          </aside>

          <section className="mentee-message-conversation">
            {selectedThread ? (
              <>
                <header className="mentee-message-conversation-header">
                  <button
                    type="button"
                    className="mentee-message-mobile-back"
                    onClick={() =>
                      setSelectedThreadId(
                        null,
                      )
                    }
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <div className="mentee-message-conversation-title">
                    <small>
                      MENTORSHIP CONVERSATION
                    </small>

                    <h2>
                      {selectedThread.mentor
                        ?.full_name ||
                        "Mentor"}
                    </h2>

                    <p>
                      {selectedThread.mentoring_area ||
                        "Mentorship"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mentee-message-view-mentor"
                    onClick={() =>
                      viewMentor(
                        selectedThread.mentor_id,
                      )
                    }
                  >
                    View mentor
                  </button>
                </header>

                <div
                  ref={
                    messagesHistoryRef
                  }
                  className="mentee-message-history"
                >
                  {loadingMessages ? (
                    <div className="mentee-message-loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div className="mentee-message-new-thread">
                      <MentorAvatar
                        connection={
                          selectedThread
                        }
                        large
                      />

                      <h3>
                        Start your
                        conversation with{" "}
                        {selectedThread
                          .mentor
                          ?.full_name ||
                          "your mentor"}
                      </h3>

                      <p>
                        Send a short message
                        to begin. Keep mentoring
                        conversations focused
                        on your agreed goals
                        and sessions.
                      </p>
                    </div>
                  ) : (
                    messages.map(
                      (message) => {
                        const isMine =
                          message.sender_id ===
                          user.id;

                        return (
                          <div
                            key={
                              message.id
                            }
                            className={`mentee-message-row ${
                              isMine
                                ? "mine"
                                : "theirs"
                            }`}
                          >
                            <div className="mentee-message-bubble">
                              <p>
                                {
                                  message.body
                                }
                              </p>

                              <small>
                                {formatMessageTime(
                                  message.created_at,
                                )}
                              </small>
                            </div>
                          </div>
                        );
                      },
                    )
                  )}
                </div>

                {error && (
                  <p
                    className="mentee-message-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <form
                  className="mentee-message-composer"
                  onSubmit={
                    handleSendMessage
                  }
                >
                  <textarea
                    ref={composerRef}
                    value={messageBody}
                    onChange={
                      handleMessageChange
                    }
                    placeholder={`Message ${
                      selectedThread.mentor
                        ?.full_name
                        ?.split(" ")[0] ||
                      "your mentor"
                    }...`}
                    rows={1}
                    disabled={sending}
                  />

                  <button
                    type="submit"
                    className="mentee-message-send-button"
                    disabled={
                      sending ||
                      !messageBody.trim()
                    }
                    aria-label="Send message"
                  >
                    <Send size={16} />

                    <span>
                      {sending
                        ? "Sending..."
                        : "Send"}
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <div className="mentee-message-no-selection">
                <MessageCircle
                  size={28}
                />

                <h3>
                  Choose a conversation
                </h3>

                <p>
                  Select a mentor from the
                  list or start a new
                  conversation.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setStartConversationOpen(
                      true,
                    )
                  }
                >
                  Start conversation
                </button>
              </div>
            )}
          </section>
        </section>

        {startConversationOpen && (
          <div
            className="mentee-message-modal-backdrop"
            role="presentation"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setStartConversationOpen(
                  false,
                );
              }
            }}
          >
            <section
              className="mentee-start-conversation-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-conversation-title"
            >
              <div className="mentee-start-conversation-header">
                <div>
                  <span>
                    NEW CONVERSATION
                  </span>

                  <h2 id="start-conversation-title">
                    Choose a mentor
                  </h2>

                  <p>
                    You can message mentors
                    connected to an accepted
                    mentorship.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={() =>
                    setStartConversationOpen(
                      false,
                    )
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mentee-start-conversation-list">
                {eligibleMentors.map(
                  (connection) => {
                    const hasThread =
                      threads.some(
                        (thread) =>
                          thread.conversationId ===
                          connection.conversationId,
                      );

                    return (
                      <button
                        key={
                          connection.id
                        }
                        type="button"
                        className="mentee-start-conversation-option"
                        onClick={() =>
                          openConversation(
                            connection,
                          )
                        }
                      >
                        <MentorAvatar
                          connection={
                            connection
                          }
                        />

                        <span className="mentee-start-conversation-copy">
                          <strong>
                            {connection
                              .mentor
                              ?.full_name ||
                              "Mentor"}
                          </strong>

                          <small>
                            {connection.mentoring_area ||
                              "Mentorship"}
                          </small>
                        </span>

                        <span className="mentee-start-conversation-action">
                          {hasThread
                            ? "Open chat"
                            : "Start chat"}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function MessageThreadButton({
  thread,
  active,
  onClick,
}) {
  const mentorName =
    thread.mentor?.full_name ||
    "Mentor";

  return (
    <button
      type="button"
      className={`mentee-message-thread ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <MentorAvatar
        connection={thread}
      />

      <span className="mentee-message-thread-copy">
        <strong>
          {mentorName}
        </strong>

        <small>
          {thread.mentoring_area ||
            "Mentorship"}
        </small>
      </span>
    </button>
  );
}

function MentorAvatar({
  connection,
  large = false,
}) {
  const mentorName =
    connection.mentor?.full_name ||
    "Mentor";

  const initials =
    getInitials(mentorName);

  const imageUrl =
    connection.mentor
      ?.profile_photo_url;

  const className = [
    "mentee-message-thread-avatar",
    imageUrl
      ? ""
      : "mentee-message-thread-initials",
    large
      ? "mentee-message-thread-avatar--large"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={className}
      />
    );
  }

  return (
    <span className={className}>
      {initials || "MC"}
    </span>
  );
}

function getConversationId(
  conversation,
) {
  if (!conversation) {
    return null;
  }

  if (
    typeof conversation === "string"
  ) {
    return conversation;
  }

  if (
    Array.isArray(conversation)
  ) {
    return (
      conversation[0]?.id ??
      conversation[0]
        ?.conversation_id ??
      null
    );
  }

  return (
    conversation.id ??
    conversation.conversation_id ??
    null
  );
}

function getInitials(value) {
  return String(value || "")
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

function formatMessageTime(value) {
  if (!value) {
    return "";
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

export default MenteeMessages;
