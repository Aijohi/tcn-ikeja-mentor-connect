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
  UserRound,
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

  const requestedAdminThread = useMemo(
    () =>
      new URLSearchParams(
        location.search,
      ).get("admin") === "1",
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

      const [
        acceptedMentorsResult,
        adminConversationsResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_my_accepted_mentors_for_messaging",
        ),

        supabase
          .from("admin_conversations")
          .select(
            `
              id,
              member_id,
              created_by_admin_id,
              assigned_admin_id,
              subject,
              status,
              created_at,
              updated_at
            `,
          )
          .eq("member_id", user.id)
          .order("updated_at", {
            ascending: false,
          }),
      ]);

      if (!isMounted) {
        return;
      }

      if (
        acceptedMentorsResult.error
      ) {
        console.error(
          "Unable to load accepted mentorships:",
          acceptedMentorsResult.error.message,
        );
      }

      if (
        adminConversationsResult.error
      ) {
        console.error(
          "Unable to load administrative conversations:",
          adminConversationsResult.error.message,
        );
      }

      const acceptedRequests =
        (
          acceptedMentorsResult.data ??
          []
        ).map((row) => ({
          id:
            row.request_id,
          mentor_id:
            row.mentor_id,
          mentoring_area:
            row.mentoring_area,
          goal_statement:
            row.goal_statement,
          status:
            row.status,
          created_at:
            row.created_at,
          mentor: {
            full_name:
              row.mentor_name,
            profile_photo_url:
              row.profile_photo_url,
          },
        }));

      const preparedMentors = [];
      let firstConversationError = "";

      for (
        const request of
        acceptedRequests
      ) {
        const {
          data: conversation,
          error:
            conversationError,
        } = await supabase.rpc(
          "ensure_mentorship_conversation",
          {
            p_request_id:
              request.id,
          },
        );

        if (conversationError) {
          console.error(
            `Unable to prepare conversation for request ${request.id}:`,
            conversationError.message,
          );

          if (
            !firstConversationError
          ) {
            firstConversationError =
              conversationError.message ||
              "We could not prepare this conversation.";
          }

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

        preparedMentors.push({
          ...request,
          threadType:
            "mentor",
          threadId:
            `mentor:${conversationId}`,
          conversationId,
        });
      }

      if (!isMounted) {
        return;
      }

      setEligibleMentors(
        preparedMentors,
      );

      const mentorConversationIds =
        preparedMentors.map(
          (item) =>
            item.conversationId,
        );

      let mentorExistingConversationIds =
        new Set();

      let mentorSummaryByConversation =
        new Map();

      if (
        mentorConversationIds.length >
        0
      ) {
        const {
          data:
            existingMentorMessages,
          error:
            existingMentorMessageError,
        } = await supabase
          .from(
            "mentorship_messages",
          )
          .select(`
            conversation_id,
            sender_id,
            recipient_id,
            body,
            read_at,
            created_at
          `)
          .in(
            "conversation_id",
            mentorConversationIds,
          );

        if (
          existingMentorMessageError
        ) {
          console.error(
            "Unable to determine existing mentor message threads:",
            existingMentorMessageError.message,
          );
        } else {
          mentorExistingConversationIds =
            new Set(
              (
                existingMentorMessages ??
                []
              ).map(
                (message) =>
                  message.conversation_id,
              ),
            );
        }

        mentorSummaryByConversation =
          buildMessageSummaryByConversation(
            existingMentorMessages ??
              [],
            user.id,
          );
      }

      const adminConversations =
        (
          adminConversationsResult.data ??
          []
        ).map(
          (conversation) => ({
            ...conversation,
            threadType:
              "admin",
            threadId:
              `admin:${conversation.id}`,
            conversationId:
              conversation.id,
            admin: {
              full_name:
                "Mentor Connect administration",
            },
          }),
        );

      const adminConversationIds =
        adminConversations.map(
          (conversation) =>
            conversation.id,
        );

      let adminSummaryByConversation =
        new Map();

      if (
        adminConversationIds.length >
        0
      ) {
        const {
          data:
            existingAdminMessages,
          error:
            existingAdminMessageError,
        } = await supabase
          .from("admin_messages")
          .select(`
            conversation_id,
            sender_id,
            recipient_id,
            body,
            read_at,
            created_at
          `)
          .in(
            "conversation_id",
            adminConversationIds,
          );

        if (
          existingAdminMessageError
        ) {
          console.error(
            "Unable to load administrative message summaries:",
            existingAdminMessageError.message,
          );
        }

        adminSummaryByConversation =
          buildMessageSummaryByConversation(
            existingAdminMessages ??
              [],
            user.id,
          );
      }

      if (!isMounted) {
        return;
      }

      let preparedMentorThreads =
        preparedMentors
          .filter((item) =>
            mentorExistingConversationIds.has(
              item.conversationId,
            ),
          )
          .map((item) => ({
            ...item,
            ...getConversationSummary(
              mentorSummaryByConversation,
              item.conversationId,
            ),
          }));

      const preparedAdminThreads =
        adminConversations.map(
          (conversation) => ({
            ...conversation,
            ...getConversationSummary(
              adminSummaryByConversation,
              conversation.id,
            ),
          }),
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
          preparedMentorThreads.some(
            (item) =>
              item.conversationId ===
              requestedMentor.conversationId,
          );

        if (!alreadyInThreads) {
          preparedMentorThreads = [
            {
              ...requestedMentor,
              ...getConversationSummary(
                mentorSummaryByConversation,
                requestedMentor.conversationId,
              ),
            },
            ...preparedMentorThreads,
          ];
        }
      }

      const allThreads = [
        ...preparedAdminThreads,
        ...preparedMentorThreads,
      ].sort((first, second) => {
        const firstDate =
          first.lastMessageAt ||
          first.updated_at ||
          first.created_at ||
          0;

        const secondDate =
          second.lastMessageAt ||
          second.updated_at ||
          second.created_at ||
          0;

        return (
          new Date(
            secondDate,
          ).getTime() -
          new Date(
            firstDate,
          ).getTime()
        );
      });

      setThreads(allThreads);

      const requestedAdminConversation =
        requestedAdminThread
          ? preparedAdminThreads[0] ??
            null
          : null;

      const requestedMentorThread =
        requestedMentor
          ? allThreads.find(
              (thread) =>
                thread.threadType ===
                  "mentor" &&
                thread.conversationId ===
                  requestedMentor.conversationId,
            )
          : null;

      setSelectedThreadId(
        (current) => {
          if (
            requestedAdminConversation
          ) {
            return (
              requestedAdminConversation.threadId
            );
          }

          if (
            requestedMentorThread
          ) {
            return (
              requestedMentorThread.threadId
            );
          }

          if (
            current &&
            allThreads.some(
              (thread) =>
                thread.threadId ===
                current,
            )
          ) {
            return current;
          }

          return (
            allThreads[0]
              ?.threadId ??
            null
          );
        },
      );

      if (
        acceptedMentorsResult.error &&
        adminConversationsResult.error &&
        allThreads.length === 0
      ) {
        setError(
          "We could not load your conversations. Please try again.",
        );
      } else if (
        preparedMentors.length ===
          0 &&
        adminConversations.length ===
          0 &&
        firstConversationError
      ) {
        setError(
          firstConversationError,
        );
      }

      setLoading(false);
    }

    loadMessagingData();

    return () => {
      isMounted = false;
    };
  }, [
    user?.id,
    requestedMentorId,
    requestedAdminThread,
  ]);

  const selectedThread = useMemo(
    () =>
      threads.find(
        (thread) =>
          thread.threadId ===
          selectedThreadId,
      ) ?? null,
    [
      threads,
      selectedThreadId,
    ],
  );

  useEffect(() => {
    if (
      !selectedThread ||
      !user?.id
    ) {
      setMessages([]);
      return undefined;
    }

    let isMounted = true;

    async function loadMessages() {
      setLoadingMessages(true);
      setError("");

      const isAdminThread =
        selectedThread.threadType ===
        "admin";

      const messageTable =
        isAdminThread
          ? "admin_messages"
          : "mentorship_messages";

      const {
        data,
        error: messageError,
      } = await supabase
        .from(messageTable)
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
          selectedThread.conversationId,
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

      const readRpc =
        isAdminThread
          ? "mark_admin_messages_read"
          : "mark_mentorship_messages_read";

      const {
        error: readError,
      } = await supabase.rpc(
        readRpc,
        {
          p_conversation_id:
            selectedThread.conversationId,
        },
      );

      if (readError) {
        console.error(
          "Unable to mark messages as read:",
          readError.message,
        );
      } else {
        setThreads(
          (current) =>
            current.map(
              (thread) =>
                thread.threadId ===
                selectedThread.threadId
                  ? {
                      ...thread,
                      unreadCount: 0,
                    }
                  : thread,
            ),
        );

        window.dispatchEvent(
          new CustomEvent(
            isAdminThread
              ? "admin:messages-read"
              : "mentorship:messages-read",
          ),
        );
      }
    }

    loadMessages();

    const table =
      selectedThread.threadType ===
      "admin"
        ? "admin_messages"
        : "mentorship_messages";

    const channel =
      supabase
        .channel(
          `mentee-${selectedThread.threadType}-message-live-${selectedThread.conversationId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table,
            filter:
              `conversation_id=eq.${selectedThread.conversationId}`,
          },
          async (payload) => {
            const incoming =
              payload.new;

            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (message) =>
                      message.id ===
                      incoming.id,
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  incoming,
                ];
              },
            );

            setThreads(
              (current) =>
                current.map(
                  (thread) =>
                    thread.threadId ===
                    selectedThread.threadId
                      ? {
                          ...thread,
                          lastMessage:
                            incoming.body,
                          lastMessageAt:
                            incoming.created_at,
                          unreadCount: 0,
                        }
                      : thread,
                ),
            );

            if (
              incoming.recipient_id ===
              user.id
            ) {
              const readRpc =
                selectedThread.threadType ===
                "admin"
                  ? "mark_admin_messages_read"
                  : "mark_mentorship_messages_read";

              await supabase.rpc(
                readRpc,
                {
                  p_conversation_id:
                    selectedThread.conversationId,
                },
              );

              window.dispatchEvent(
                new CustomEvent(
                  selectedThread.threadType ===
                    "admin"
                    ? "admin:messages-read"
                    : "mentorship:messages-read",
                ),
              );
            }
          },
        )
        .subscribe();

    return () => {
      isMounted = false;

      supabase.removeChannel(
        channel,
      );
    };
  }, [
    selectedThread?.threadType,
    selectedThread?.threadId,
    selectedThread?.conversationId,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !user?.id ||
      threads.length === 0
    ) {
      return undefined;
    }

    const adminConversationIds =
      new Set(
        threads
          .filter(
            (thread) =>
              thread.threadType ===
              "admin",
          )
          .map(
            (thread) =>
              thread.conversationId,
          ),
      );

    const mentorConversationIds =
      new Set(
        threads
          .filter(
            (thread) =>
              thread.threadType ===
              "mentor",
          )
          .map(
            (thread) =>
              thread.conversationId,
          ),
      );

    function updateBackgroundThread(
      incoming,
      threadType,
    ) {
      const threadId =
        `${threadType}:${incoming.conversation_id}`;

      if (
        threadId ===
        selectedThreadId
      ) {
        return;
      }

      setThreads(
        (current) =>
          current.map(
            (thread) => {
              if (
                thread.threadId !==
                threadId
              ) {
                return thread;
              }

              const isIncoming =
                incoming.recipient_id ===
                user.id;

              return {
                ...thread,
                lastMessage:
                  incoming.body,
                lastMessageAt:
                  incoming.created_at,
                unreadCount:
                  isIncoming
                    ? Number(
                        thread.unreadCount ??
                          0,
                      ) + 1
                    : Number(
                        thread.unreadCount ??
                          0,
                      ),
              };
            },
          ),
      );
    }

    const channel =
      supabase
        .channel(
          `mentee-all-message-notifications-${user.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "mentorship_messages",
          },
          (payload) => {
            const incoming =
              payload.new;

            if (
              incoming.sender_id !==
                user.id &&
              incoming.recipient_id !==
                user.id
            ) {
              return;
            }

            if (
              !mentorConversationIds.has(
                incoming.conversation_id,
              )
            ) {
              return;
            }

            updateBackgroundThread(
              incoming,
              "mentor",
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "admin_messages",
          },
          (payload) => {
            const incoming =
              payload.new;

            if (
              incoming.sender_id !==
                user.id &&
              incoming.recipient_id !==
                user.id
            ) {
              return;
            }

            if (
              !adminConversationIds.has(
                incoming.conversation_id,
              )
            ) {
              return;
            }

            updateBackgroundThread(
              incoming,
              "admin",
            );
          },
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel,
      );
    };
  }, [
    user?.id,
    threads,
    selectedThreadId,
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
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [startConversationOpen]);

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
            thread.threadId ===
            mentorConnection.threadId,
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
      mentorConnection.threadId,
    );

    setStartConversationOpen(false);
    setError("");
    setMessageBody("");

    navigate(
      `/mentee/messages?mentor=${mentorConnection.mentor_id}`,
      {
        replace: true,
      },
    );

    if (composerRef.current) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function selectThread(
    thread,
  ) {
    setSelectedThreadId(
      thread.threadId,
    );

    setMessageBody("");

    if (
      thread.threadType === "admin"
    ) {
      navigate(
        "/mentee/messages?admin=1",
        {
          replace: true,
        },
      );
    } else {
      navigate(
        `/mentee/messages?mentor=${thread.mentor_id}`,
        {
          replace: true,
        },
      );
    }

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
      !selectedThread ||
      !trimmedMessage ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const isAdminThread =
      selectedThread.threadType ===
      "admin";

    const sendRpc =
      isAdminThread
        ? "send_admin_message"
        : "send_mentorship_message";

    const {
      data,
      error: sendError,
    } = await supabase.rpc(
      sendRpc,
      {
        p_conversation_id:
          selectedThread.conversationId,
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

    const sentMessage =
      Array.isArray(data)
        ? data[0]
        : data;

    if (sentMessage) {
      setMessages((current) => {
        const alreadyExists =
          current.some(
            (message) =>
              message.id ===
              sentMessage.id,
          );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          sentMessage,
        ];
      });

      setThreads(
        (current) =>
          current.map(
            (thread) =>
              thread.threadId ===
              selectedThread.threadId
                ? {
                    ...thread,
                    lastMessage:
                      sentMessage.body,
                    lastMessageAt:
                      sentMessage.created_at,
                  }
                : thread,
          ),
      );
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

  function closeMobileConversation() {
    setSelectedThreadId(null);
    setMessageBody("");

    navigate(
      "/mentee/messages",
      {
        replace: true,
      },
    );
  }

  const hasAnyThread =
    threads.length > 0;

  const hasMentorMessaging =
    eligibleMentors.length > 0;

  if (loading) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentors and receive messages from Mentor Connect administration."
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
    !hasAnyThread &&
    !hasMentorMessaging
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentors and receive messages from Mentor Connect administration."
      >
        <div className="mentee-messages-page">
          <section className="mentee-message-page-empty">
            <span className="mentee-message-page-empty-icon">
              <MessageCircle
                size={27}
              />
            </span>

            <h2>
              Conversations could not load
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
    !hasAnyThread &&
    !hasMentorMessaging
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentors and receive messages from Mentor Connect administration."
      >
        <div className="mentee-messages-page">
          <section className="mentee-message-page-empty">
            <span className="mentee-message-page-empty-icon">
              <HeartHandshake
                size={28}
              />
            </span>

            <h2>
              No conversations yet
            </h2>

            <p>
              Mentor conversations unlock after a mentor accepts your mentorship request. Messages from Mentor Connect administration will also appear here when they contact you.
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
      description="Chat with your mentors and receive messages from Mentor Connect administration."
    >
      <div className="mentee-messages-page">
        <div className="mentee-message-page-toolbar">
          <div>
            <span className="mentee-message-toolbar-eyebrow">
              MESSAGES
            </span>

            <p>
              Continue your mentorship conversations and reply to administrative messages.
            </p>
          </div>

          {hasMentorMessaging && (
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
          )}
        </div>

        <section className="mentee-messages-layout">
          <aside className="mentee-message-threads">
            <div className="mentee-message-threads-heading">
              <span className="eyebrow">
                CONVERSATIONS
              </span>

              <h2>
                Messages
              </h2>
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
                  Start a conversation with a mentor from an accepted mentorship.
                </p>

                {hasMentorMessaging && (
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
                )}
              </div>
            ) : (
              <div className="mentee-message-thread-list">
                {threads.map(
                  (thread) => (
                    <MessageThreadButton
                      key={
                        thread.threadId
                      }
                      thread={
                        thread
                      }
                      active={
                        thread.threadId ===
                        selectedThreadId
                      }
                      onClick={() =>
                        selectThread(
                          thread,
                        )
                      }
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
                    onClick={
                      closeMobileConversation
                    }
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <div className="mentee-message-conversation-title">
                    <small>
                      {selectedThread.threadType ===
                      "admin"
                        ? "ADMINISTRATIVE CONVERSATION"
                        : "MENTORSHIP CONVERSATION"}
                    </small>

                    <h2>
                      {selectedThread.threadType ===
                      "admin"
                        ? "Mentor Connect administration"
                        : selectedThread.mentor
                            ?.full_name ||
                          "Mentor"}
                    </h2>

                    <p>
                      {selectedThread.threadType ===
                      "admin"
                        ? selectedThread.subject ||
                          "Platform support"
                        : selectedThread.mentoring_area ||
                          "Mentorship"}
                    </p>
                  </div>

                  {selectedThread.threadType ===
                    "mentor" && (
                    <button
                      type="button"
                      className="mentee-message-view-mentor"
                      onClick={() =>
                        viewMentor(
                          selectedThread.mentor_id,
                        )
                      }
                    >
                      <UserRound
                        size={15}
                      />

                      View mentor
                    </button>
                  )}
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
                      {selectedThread.threadType ===
                      "admin" ? (
                        <span className="mentee-message-thread-avatar mentee-message-thread-initials mentee-message-thread-avatar--large">
                          MC
                        </span>
                      ) : (
                        <MentorAvatar
                          connection={
                            selectedThread
                          }
                          large
                        />
                      )}

                      <h3>
                        {selectedThread.threadType ===
                        "admin"
                          ? "Administrative conversation"
                          : `Start your conversation with ${
                              selectedThread
                                .mentor
                                ?.full_name ||
                              "your mentor"
                            }`}
                      </h3>

                      <p>
                        {selectedThread.threadType ===
                        "admin"
                          ? "Reply here to communicate privately with the Mentor Connect administration team."
                          : "Send a short message to begin. Keep mentoring conversations focused on your agreed goals and sessions."}
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
                    placeholder={
                      selectedThread.threadType ===
                      "admin"
                        ? "Reply to Mentor Connect administration..."
                        : `Message ${
                            selectedThread.mentor
                              ?.full_name
                              ?.split(" ")[0] ||
                            "your mentor"
                          }...`
                    }
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
                  Select a conversation from the list.
                </p>

                {hasMentorMessaging && (
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
                )}
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
                    You can message mentors connected to an accepted mentorship.
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
                          thread.threadType ===
                            "mentor" &&
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
  const isAdmin =
    thread.threadType ===
    "admin";

  const displayName =
    isAdmin
      ? "Mentor Connect administration"
      : thread.mentor?.full_name ||
        "Mentor";

  const subtitle =
    isAdmin
      ? thread.subject ||
        "Platform support"
      : thread.mentoring_area ||
        "Mentorship";

  return (
    <button
      type="button"
      className={`mentee-message-thread ${
        active ? "active" : ""
      } ${
        Number(
          thread.unreadCount ?? 0,
        ) > 0
          ? "has-unread"
          : ""
      }`}
      onClick={onClick}
    >
      {isAdmin ? (
        <span className="mentee-message-thread-avatar mentee-message-thread-initials">
          MC
        </span>
      ) : (
        <MentorAvatar
          connection={thread}
        />
      )}

      <span className="mentee-message-thread-copy">
        <strong>
          {displayName}
        </strong>

        <small>
          {subtitle}
        </small>
      </span>

      {Number(
        thread.unreadCount ?? 0,
      ) > 0 && (
        <span
          className="mentee-message-thread-unread"
          aria-label={`${thread.unreadCount} unread ${
            thread.unreadCount === 1
              ? "message"
              : "messages"
          }`}
        >
          {thread.unreadCount > 99
            ? "99+"
            : thread.unreadCount}
        </span>
      )}
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

function buildMessageSummaryByConversation(
  messages,
  userId,
) {
  const summaries =
    new Map();

  for (
    const message of messages
  ) {
    const conversationId =
      message.conversation_id;

    if (!conversationId) {
      continue;
    }

    const current =
      summaries.get(
        conversationId,
      ) ?? {
        unreadCount: 0,
        lastMessage: "",
        lastMessageAt: null,
      };

    if (
      message.recipient_id ===
        userId &&
      !message.read_at
    ) {
      current.unreadCount +=
        1;
    }

    if (
      !current.lastMessageAt ||
      new Date(
        message.created_at,
      ).getTime() >
        new Date(
          current.lastMessageAt,
        ).getTime()
    ) {
      current.lastMessage =
        message.body ?? "";

      current.lastMessageAt =
        message.created_at;
    }

    summaries.set(
      conversationId,
      current,
    );
  }

  return summaries;
}

function getConversationSummary(
  summaryMap,
  conversationId,
) {
  return (
    summaryMap.get(
      conversationId,
    ) ?? {
      unreadCount: 0,
      lastMessage: "",
      lastMessageAt: null,
    }
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
