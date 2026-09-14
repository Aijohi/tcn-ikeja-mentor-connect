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

import "./MentorMessages.css";

function MentorMessages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [
    eligibleMentees,
    setEligibleMentees,
  ] = useState([]);

  const [
    threads,
    setThreads,
  ] = useState([]);

  const [
    selectedThreadId,
    setSelectedThreadId,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    messageBody,
    setMessageBody,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    startConversationOpen,
    setStartConversationOpen,
  ] = useState(false);

  const messagesHistoryRef =
    useRef(null);

  const composerRef =
    useRef(null);

  const requestedMenteeId =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get("mentee"),
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
        data: activeMentees,
        error: menteesError,
      } = await supabase.rpc(
        "get_my_active_mentees",
      );

      if (!isMounted) {
        return;
      }

      if (menteesError) {
        console.error(
          "Unable to load active mentees:",
          menteesError.message,
        );

        setError(
          "We could not load your mentorship conversations. Please try again.",
        );

        setEligibleMentees([]);
        setThreads([]);
        setLoading(false);
        return;
      }

      const accepted =
        activeMentees ?? [];

      if (accepted.length === 0) {
        setEligibleMentees([]);
        setThreads([]);
        setSelectedThreadId(null);
        setLoading(false);
        return;
      }

      const preparedMentees = [];

      for (const connection of accepted) {
        const {
          data: conversation,
          error: conversationError,
        } = await supabase.rpc(
          "ensure_mentorship_conversation",
          {
            p_request_id:
              connection.request_id,
          },
        );

        if (conversationError) {
          console.error(
            `Unable to prepare conversation for request ${connection.request_id}:`,
            conversationError.message,
          );

          continue;
        }

        const conversationId =
          getConversationId(
            conversation,
          );

        if (!conversationId) {
          console.error(
            "Conversation was prepared but no conversation id was returned.",
          );

          continue;
        }

        preparedMentees.push({
          ...connection,
          conversationId,
        });
      }

      if (!isMounted) {
        return;
      }

      setEligibleMentees(
        preparedMentees,
      );

      const conversationIds =
        preparedMentees.map(
          (item) =>
            item.conversationId,
        );

      let existingConversationIds =
        new Set();

      if (
        conversationIds.length >
        0
      ) {
        const {
          data: existingMessages,
          error:
            existingMessageError,
        } = await supabase
          .from(
            "mentorship_messages",
          )
          .select(
            "conversation_id",
          )
          .in(
            "conversation_id",
            conversationIds,
          );

        if (
          existingMessageError
        ) {
          console.error(
            "Unable to determine existing message threads:",
            existingMessageError.message,
          );
        } else {
          existingConversationIds =
            new Set(
              (
                existingMessages ??
                []
              ).map(
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
        preparedMentees.filter(
          (item) =>
            existingConversationIds.has(
              item.conversationId,
            ),
        );

      const requestedMentee =
        requestedMenteeId
          ? preparedMentees.find(
              (item) =>
                item.mentee_id ===
                requestedMenteeId,
            )
          : null;

      if (requestedMentee) {
        const alreadyInThreads =
          preparedThreads.some(
            (item) =>
              item.conversationId ===
              requestedMentee.conversationId,
          );

        if (!alreadyInThreads) {
          preparedThreads = [
            requestedMentee,
            ...preparedThreads,
          ];
        }

        setSelectedThreadId(
          requestedMentee.conversationId,
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
                ?.conversationId ??
              null
            );
          },
        );
      }

      setThreads(
        preparedThreads,
      );

      setLoading(false);
    }

    loadMessagingData();

    return () => {
      isMounted = false;
    };
  }, [
    user?.id,
    requestedMenteeId,
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
        .from(
          "mentorship_messages",
        )
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
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

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

      setMessages(
        data ?? [],
      );

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

    requestAnimationFrame(
      () => {
        history.scrollTop =
          history.scrollHeight;
      },
    );
  }, [
    messages,
    loadingMessages,
    selectedThreadId,
  ]);

  useEffect(() => {
    if (
      !startConversationOpen
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event,
    ) {
      if (
        event.key ===
        "Escape"
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

  const selectedThread =
    useMemo(
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
    menteeConnection,
  ) {
    if (!menteeConnection) {
      return;
    }

    setThreads(
      (current) => {
        const alreadyExists =
          current.some(
            (thread) =>
              thread.conversationId ===
              menteeConnection.conversationId,
          );

        if (alreadyExists) {
          return current;
        }

        return [
          menteeConnection,
          ...current,
        ];
      },
    );

    setSelectedThreadId(
      menteeConnection.conversationId,
    );

    setStartConversationOpen(
      false,
    );

    setError("");
    setMessageBody("");

    if (
      composerRef.current
    ) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function handleMessageChange(
    event,
  ) {
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
        p_body:
          trimmedMessage,
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
      setMessages(
        (current) => {
          const alreadyExists =
            current.some(
              (message) =>
                message.id ===
                data.id,
            );

          if (
            alreadyExists
          ) {
            return current;
          }

          return [
            ...current,
            data,
          ];
        },
      );
    }

    setMessageBody("");

    if (
      composerRef.current
    ) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function viewMentee(
    requestId,
  ) {
    if (!requestId) {
      return;
    }

    navigate(
      `/mentor/mentees/${requestId}`,
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentees after a mentorship request has been accepted."
      >
        <div className="mentor-messages-page">
          <section className="mentor-message-loading-page">
            <span className="mentor-message-loading-block mentor-message-loading-block--short" />
            <span className="mentor-message-loading-block" />
            <span className="mentor-message-loading-block" />
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    eligibleMentees.length ===
      0
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentees after a mentorship request has been accepted."
      >
        <div className="mentor-messages-page">
          <section className="mentor-message-page-empty">
            <span className="mentor-message-page-empty-icon">
              <MessageCircle
                size={27}
              />
            </span>

            <h2>
              Unable to load messages
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="mentor-message-primary-button"
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
    eligibleMentees.length ===
    0
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with mentees after a mentorship request has been accepted."
      >
        <div className="mentor-messages-page">
          <section className="mentor-message-page-empty">
            <span className="mentor-message-page-empty-icon">
              <HeartHandshake
                size={28}
              />
            </span>

            <h2>
              No conversations yet
            </h2>

            <p>
              Once you accept a mentorship request, you can start a conversation with that mentee here.
            </p>

            <button
              type="button"
              className="mentor-message-primary-button"
              onClick={() =>
                navigate(
                  "/mentor/requests",
                )
              }
            >
              View mentorship requests
            </button>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Messages"
      description="Chat with mentees after a mentorship request has been accepted."
    >
      <div className="mentor-messages-page">
        <div className="mentor-message-page-toolbar">
          <div>
            <span className="mentor-message-toolbar-eyebrow">
              MENTEE MESSAGES
            </span>

            <p>
              Continue a conversation or start one with an active mentee.
            </p>
          </div>

          <button
            type="button"
            className="mentor-message-start-button"
            onClick={() =>
              setStartConversationOpen(
                true,
              )
            }
          >
            Start conversation
          </button>
        </div>

        <section className="mentor-messages-layout">
          <aside className="mentor-message-threads">
            <div className="mentor-message-threads-heading">
              <span className="eyebrow">
                CONVERSATIONS
              </span>

              <h2>
                Mentees
              </h2>
            </div>

            {threads.length ===
            0 ? (
              <div className="mentor-message-empty-list">
                <MessageCircle
                  size={24}
                />

                <h3>
                  No conversations yet
                </h3>

                <p>
                  Start a conversation with one of your active mentees.
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
              <div className="mentor-message-thread-list">
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

          <section className="mentor-message-conversation">
            {selectedThread ? (
              <>
                <header className="mentor-message-conversation-header">
                  <button
                    type="button"
                    className="mentor-message-mobile-back"
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

                  <div className="mentor-message-conversation-title">
                    <small>
                      MENTORSHIP CONVERSATION
                    </small>

                    <h2>
                      {selectedThread.mentee_name ||
                        "Mentee"}
                    </h2>

                    <p>
                      {selectedThread.mentoring_area ||
                        "Mentorship"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mentor-message-view-mentee"
                    onClick={() =>
                      viewMentee(
                        selectedThread.request_id,
                      )
                    }
                  >
                    View mentee
                  </button>
                </header>

                <div
                  ref={
                    messagesHistoryRef
                  }
                  className="mentor-message-history"
                >
                  {loadingMessages ? (
                    <div className="mentor-message-loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div className="mentor-message-new-thread">
                      <MenteeAvatar
                        connection={
                          selectedThread
                        }
                        large
                      />

                      <h3>
                        Start your conversation with{" "}
                        {selectedThread.mentee_name ||
                          "your mentee"}
                      </h3>

                      <p>
                        Send a short message to begin. Keep the conversation focused on the agreed mentoring goals and sessions.
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
                            className={`mentor-message-row ${
                              isMine
                                ? "mine"
                                : "theirs"
                            }`}
                          >
                            <div className="mentor-message-bubble">
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
                    className="mentor-message-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <form
                  className="mentor-message-composer"
                  onSubmit={
                    handleSendMessage
                  }
                >
                  <textarea
                    ref={
                      composerRef
                    }
                    value={
                      messageBody
                    }
                    onChange={
                      handleMessageChange
                    }
                    placeholder={`Message ${
                      selectedThread.mentee_name
                        ?.split(
                          " ",
                        )[0] ||
                      "your mentee"
                    }...`}
                    rows={1}
                    disabled={
                      sending
                    }
                  />

                  <button
                    type="submit"
                    className="mentor-message-send-button"
                    disabled={
                      sending ||
                      !messageBody.trim()
                    }
                    aria-label="Send message"
                  >
                    <Send
                      size={16}
                    />

                    <span>
                      {sending
                        ? "Sending..."
                        : "Send"}
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <div className="mentor-message-no-selection">
                <MessageCircle
                  size={28}
                />

                <h3>
                  Choose a conversation
                </h3>

                <p>
                  Select a mentee from the list or start a new conversation.
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
            className="mentor-message-modal-backdrop"
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
              className="mentor-start-conversation-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mentor-start-conversation-title"
            >
              <div className="mentor-start-conversation-header">
                <div>
                  <span>
                    NEW CONVERSATION
                  </span>

                  <h2 id="mentor-start-conversation-title">
                    Choose a mentee
                  </h2>

                  <p>
                    You can message mentees connected to an accepted mentorship.
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
                  <X
                    size={18}
                  />
                </button>
              </div>

              <div className="mentor-start-conversation-list">
                {eligibleMentees.map(
                  (
                    connection,
                  ) => {
                    const hasThread =
                      threads.some(
                        (
                          thread,
                        ) =>
                          thread.conversationId ===
                          connection.conversationId,
                      );

                    return (
                      <button
                        key={
                          connection.request_id
                        }
                        type="button"
                        className="mentor-start-conversation-option"
                        onClick={() =>
                          openConversation(
                            connection,
                          )
                        }
                      >
                        <MenteeAvatar
                          connection={
                            connection
                          }
                        />

                        <span className="mentor-start-conversation-copy">
                          <strong>
                            {connection.mentee_name ||
                              "Mentee"}
                          </strong>

                          <small>
                            {connection.mentoring_area ||
                              "Mentorship"}
                          </small>
                        </span>

                        <span className="mentor-start-conversation-action">
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
  return (
    <button
      type="button"
      className={`mentor-message-thread ${
        active
          ? "active"
          : ""
      }`}
      onClick={
        onClick
      }
    >
      <MenteeAvatar
        connection={
          thread
        }
      />

      <span className="mentor-message-thread-copy">
        <strong>
          {thread.mentee_name ||
            "Mentee"}
        </strong>

        <small>
          {thread.mentoring_area ||
            "Mentorship"}
        </small>
      </span>
    </button>
  );
}

function MenteeAvatar({
  connection,
  large = false,
}) {
  const menteeName =
    connection.mentee_name ||
    "Mentee";

  const initials =
    getInitials(
      menteeName,
    );

  const imageUrl =
    connection.profile_photo_url;

  const className = [
    "mentor-message-thread-avatar",
    imageUrl
      ? ""
      : "mentor-message-thread-initials",
    large
      ? "mentor-message-thread-avatar--large"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (imageUrl) {
    return (
      <img
        src={
          imageUrl
        }
        alt=""
        className={
          className
        }
      />
    );
  }

  return (
    <span
      className={
        className
      }
    >
      {initials ||
        "MC"}
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
    typeof conversation ===
    "string"
  ) {
    return conversation;
  }

  if (
    Array.isArray(
      conversation,
    )
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

function getInitials(
  value,
) {
  return String(
    value || "",
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

function formatMessageTime(
  value,
) {
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

export default MentorMessages;
