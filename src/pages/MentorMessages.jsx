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

  const requestedRequestId =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get("request"),
      [location.search],
    );

  const requestedAdminThread =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get("admin") === "1",
      [location.search],
    );

  const routedConversation =
    location.state
      ?.conversationRequest ??
    null;

  useEffect(() => {
    let isMounted = true;

    async function prepareConnection(
      connection,
    ) {
      const requestId =
        connection.request_id;

      if (!requestId) {
        return {
          connection: null,
          error:
            "This accepted mentorship is missing its request reference.",
        };
      }

      const {
        data: conversation,
        error: conversationError,
      } = await supabase.rpc(
        "ensure_mentorship_conversation",
        {
          p_request_id:
            requestId,
        },
      );

      if (conversationError) {
        console.error(
          `Unable to prepare conversation for request ${requestId}:`,
          conversationError.message,
        );

        return {
          connection: null,
          error:
            conversationError.message ||
            "We could not start this conversation.",
        };
      }

      const conversationId =
        getConversationId(
          conversation,
        );

      if (!conversationId) {
        return {
          connection: null,
          error:
            "The conversation was prepared, but no conversation id was returned.",
        };
      }

      return {
        connection: {
          ...connection,
          threadType:
            "mentee",
          threadId:
            `mentee:${conversationId}`,
          conversationId,
        },
        error: "",
      };
    }

    async function loadMessagingData() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      /*
       * If the mentor clicked "Message mentee" from an accepted
       * request, try that relationship first. This means the mentor
       * can start the first message even when there is no existing
       * conversation thread yet.
       */
      let directConnection =
        routedConversation;

      if (
        !directConnection &&
        requestedRequestId
      ) {
        const {
          data:
            requestDetails,
          error:
            requestDetailsError,
        } = await supabase.rpc(
          "get_mentor_request_details",
          {
            p_request_id:
              requestedRequestId,
          },
        );

        if (
          !requestDetailsError &&
          requestDetails?.status ===
            "accepted"
        ) {
          directConnection = {
            request_id:
              requestDetails.id,
            mentee_id:
              requestDetails.mentee_id,
            mentee_name:
              requestDetails.mentee
                ?.full_name ||
              "Mentee",
            mentee_email:
              requestDetails.mentee
                ?.email ||
              "",
            profile_photo_url:
              requestDetails.mentee
                ?.profile_photo_url ||
              null,
            mentoring_area:
              requestDetails.mentoring_area ||
              "Mentorship",
          };
        }
      }

      const [
        activeMenteesResult,
        adminConversationsResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_my_active_mentees",
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
        activeMenteesResult.error
      ) {
        console.error(
          "Unable to load active mentees:",
          activeMenteesResult.error.message,
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

      let accepted =
        activeMenteesResult.data ??
        [];

      /*
       * The request-details screen already knows which accepted
       * mentee the mentor wants to message. Merge it into the
       * eligible list if the active-mentee read has not returned it.
       */
      if (directConnection) {
        const alreadyIncluded =
          accepted.some(
            (item) =>
              item.request_id ===
              directConnection.request_id,
          );

        if (!alreadyIncluded) {
          accepted = [
            directConnection,
            ...accepted,
          ];
        }
      }

      const preparedMentees =
        [];

      let firstPreparationError =
        "";

      for (
        const connection of accepted
      ) {
        const {
          connection:
            preparedConnection,
          error:
            preparationError,
        } = await prepareConnection(
          connection,
        );

        if (
          preparedConnection
        ) {
          preparedMentees.push(
            preparedConnection,
          );
        } else if (
          !firstPreparationError
        ) {
          firstPreparationError =
            preparationError;
        }
      }

      if (!isMounted) {
        return;
      }

      setEligibleMentees(
        preparedMentees,
      );

      const mentorConversationIds =
        preparedMentees.map(
          (item) =>
            item.conversationId,
        );

      let existingConversationIds =
        new Set();

      let mentorshipSummaryByConversation =
        new Map();

      if (
        mentorConversationIds.length >
        0
      ) {
        const {
          data:
            existingMessages,
          error:
            existingMessageError,
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
          existingMessageError
        ) {
          console.error(
            "Unable to determine existing mentorship message threads:",
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

        mentorshipSummaryByConversation =
          buildMessageSummaryByConversation(
            existingMessages ??
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

      let preparedMenteeThreads =
        preparedMentees
          .filter(
            (item) =>
              existingConversationIds.has(
                item.conversationId,
              ),
          )
          .map(
            (item) => ({
              ...item,
              ...getConversationSummary(
                mentorshipSummaryByConversation,
                item.conversationId,
              ),
            }),
          );

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

      const requestedConnection =
        preparedMentees.find(
          (item) =>
            (requestedRequestId &&
              item.request_id ===
                requestedRequestId) ||
            (requestedMenteeId &&
              item.mentee_id ===
                requestedMenteeId) ||
            (directConnection &&
              item.request_id ===
                directConnection.request_id),
        ) ?? null;

      /*
       * No message has been sent yet? That is okay.
       * Put the accepted mentee into the conversation list anyway
       * and open the blank chat canvas so the mentor can send the
       * very first message.
       */
      if (
        requestedConnection
      ) {
        const alreadyInThreads =
          preparedMenteeThreads.some(
            (item) =>
              item.conversationId ===
              requestedConnection.conversationId,
          );

        if (
          !alreadyInThreads
        ) {
          preparedMenteeThreads = [
            {
              ...requestedConnection,
              ...getConversationSummary(
                mentorshipSummaryByConversation,
                requestedConnection.conversationId,
              ),
            },
            ...preparedMenteeThreads,
          ];
        }
      }

      const allThreads = [
        ...preparedAdminThreads,
        ...preparedMenteeThreads,
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

      setThreads(
        allThreads,
      );

      const requestedAdminConversation =
        requestedAdminThread
          ? preparedAdminThreads[0] ??
            null
          : null;

      const requestedMenteeThread =
        requestedConnection
          ? allThreads.find(
              (thread) =>
                thread.threadType ===
                  "mentee" &&
                thread.conversationId ===
                  requestedConnection.conversationId,
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
            requestedMenteeThread
          ) {
            return (
              requestedMenteeThread.threadId
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
        activeMenteesResult.error &&
        adminConversationsResult.error &&
        allThreads.length === 0
      ) {
        setError(
          "We could not load your conversations. Please try again.",
        );
      } else if (
        preparedMentees.length ===
          0 &&
        adminConversations.length ===
          0 &&
        firstPreparationError
      ) {
        setError(
          firstPreparationError,
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
    requestedMenteeId,
    requestedRequestId,
    requestedAdminThread,
    routedConversation,
  ]);

  const selectedThread =
    useMemo(
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
          `mentor-${selectedThread.threadType}-message-live-${selectedThread.conversationId}`,
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
          async (
            payload,
          ) => {
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

    const menteeConversationIds =
      new Set(
        threads
          .filter(
            (thread) =>
              thread.threadType ===
              "mentee",
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
          `mentor-all-message-notifications-${user.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "mentorship_messages",
          },
          (
            payload,
          ) => {
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
              !menteeConversationIds.has(
                incoming.conversation_id,
              )
            ) {
              return;
            }

            updateBackgroundThread(
              incoming,
              "mentee",
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
          (
            payload,
          ) => {
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
  }, [
    startConversationOpen,
  ]);

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
              thread.threadId ===
              menteeConnection.threadId,
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
      menteeConnection.threadId,
    );

    setStartConversationOpen(
      false,
    );

    setError("");
    setMessageBody("");

    navigate(
      `/mentor/messages?request=${menteeConnection.request_id}`,
      {
        replace: true,
      },
    );

    if (
      composerRef.current
    ) {
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
      thread.threadType ===
      "admin"
    ) {
      navigate(
        "/mentor/messages?admin=1",
        {
          replace: true,
        },
      );
    } else {
      navigate(
        `/mentor/messages?request=${thread.request_id}`,
        {
          replace: true,
        },
      );
    }

    if (
      composerRef.current
    ) {
      composerRef.current.style.height =
        "44px";
    }
  }

  function closeMobileConversation() {
    setSelectedThreadId(
      null,
    );

    setMessageBody("");

    navigate(
      "/mentor/messages",
      {
        replace: true,
      },
    );
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

    const sentMessage =
      Array.isArray(data)
        ? data[0]
        : data;

    if (sentMessage) {
      setMessages(
        (current) => {
          const alreadyExists =
            current.some(
              (message) =>
                message.id ===
                sentMessage.id,
            );

          if (
            alreadyExists
          ) {
            return current;
          }

          return [
            ...current,
            sentMessage,
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
                      sentMessage.body,
                    lastMessageAt:
                      sentMessage.created_at,
                  }
                : thread,
          ),
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

  const hasAnyThread =
    threads.length > 0;

  const hasMenteeMessaging =
    eligibleMentees.length > 0;

  if (loading) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentees and receive messages from Mentor Connect administration."
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
    !hasAnyThread &&
    !hasMenteeMessaging
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentees and receive messages from Mentor Connect administration."
      >
        <div className="mentor-messages-page">
          <section className="mentor-message-page-empty">
            <span className="mentor-message-page-empty-icon">
              <MessageCircle
                size={27}
              />
            </span>

            <h2>
              Conversations could not load
            </h2>

            <p>
              {error}
            </p>

            <div className="mentor-message-empty-actions">
              <button
                type="button"
                className="mentor-message-primary-button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try again
              </button>

              <button
                type="button"
                className="mentor-message-empty-secondary"
                onClick={() =>
                  navigate(
                    "/mentor/mentees",
                  )
                }
              >
                View my mentees
              </button>
            </div>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (
    !hasAnyThread &&
    !hasMenteeMessaging
  ) {
    return (
      <DashboardLayout
        title="Messages"
        description="Chat with your mentees and receive messages from Mentor Connect administration."
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
              Mentee conversations become available after you accept a mentorship request. Messages from Mentor Connect administration will also appear here when they contact you.
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
      description="Chat with your mentees and receive messages from Mentor Connect administration."
    >
      <div className="mentor-messages-page">
        <div className="mentor-message-page-toolbar">
          <div>
            <span className="mentor-message-toolbar-eyebrow">
              MESSAGES
            </span>

            <p>
              Continue your mentorship conversations and reply to administrative messages.
            </p>
          </div>

          {hasMenteeMessaging && (
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
          )}
        </div>

        <section className="mentor-messages-layout">
          <aside className="mentor-message-threads">
            <div className="mentor-message-threads-heading">
              <span className="eyebrow">
                CONVERSATIONS
              </span>

              <h2>
                Messages
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

                {hasMenteeMessaging && (
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
              <div className="mentor-message-thread-list">
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

          <section className="mentor-message-conversation">
            {selectedThread ? (
              <>
                <header className="mentor-message-conversation-header">
                  <button
                    type="button"
                    className="mentor-message-mobile-back"
                    onClick={
                      closeMobileConversation
                    }
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <div className="mentor-message-conversation-title">
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
                        : selectedThread.mentee_name ||
                          "Mentee"}
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
                    "mentee" && (
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
                  )}
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
                      {selectedThread.threadType ===
                      "admin" ? (
                        <span className="mentor-message-thread-avatar mentor-message-thread-initials mentor-message-thread-avatar--large">
                          MC
                        </span>
                      ) : (
                        <MenteeAvatar
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
                              selectedThread.mentee_name ||
                              "your mentee"
                            }`}
                      </h3>

                      <p>
                        {selectedThread.threadType ===
                        "admin"
                          ? "Reply here to communicate privately with the Mentor Connect administration team."
                          : "Send a short message to begin. Keep the conversation focused on the agreed mentoring goals and sessions."}
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
                    placeholder={
                      selectedThread.threadType ===
                      "admin"
                        ? "Reply to Mentor Connect administration..."
                        : `Message ${
                            selectedThread.mentee_name
                              ?.split(
                                " ",
                              )[0] ||
                            "your mentee"
                          }...`
                    }
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
                  Select a conversation from the list.
                </p>

                {hasMenteeMessaging && (
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
                          thread.threadType ===
                            "mentee" &&
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
  const isAdmin =
    thread.threadType ===
    "admin";

  const displayName =
    isAdmin
      ? "Mentor Connect administration"
      : thread.mentee_name ||
        "Mentee";

  const subtitle =
    isAdmin
      ? thread.subject ||
        "Platform support"
      : thread.mentoring_area ||
        "Mentorship";

  return (
    <button
      type="button"
      className={`mentor-message-thread ${
        active
          ? "active"
          : ""
      } ${
        Number(
          thread.unreadCount ?? 0,
        ) > 0
          ? "has-unread"
          : ""
      }`}
      onClick={
        onClick
      }
    >
      {isAdmin ? (
        <span className="mentor-message-thread-avatar mentor-message-thread-initials">
          MC
        </span>
      ) : (
        <MenteeAvatar
          connection={
            thread
          }
        />
      )}

      <span className="mentor-message-thread-copy">
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
          className="mentor-message-thread-unread"
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
