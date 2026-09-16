import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  MessageCircle,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./NotificationBell.css";

function NotificationBell({
  userId,
}) {
  const navigate =
    useNavigate();

  const [
    panelOpen,
    setPanelOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.read_at,
        ).length,
      [notifications],
    );

  const loadNotifications =
    useCallback(
      async () => {
        if (!userId) {
          setNotifications([]);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const {
            data,
            error:
              notificationError,
          } = await supabase
            .from("notifications")
            .select(`
              id,
              user_id,
              type,
              title,
              message,
              link,
              read_at,
              created_at
            `)
            .eq(
              "user_id",
              userId,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            )
            .limit(50);

          if (
            notificationError
          ) {
            console.error(
              "Unable to load notifications:",
              notificationError.message,
            );

            setError(
              "We could not load your notifications.",
            );

            setLoading(false);
            return;
          }

          setNotifications(
            data ?? [],
          );
        } catch (
          loadError
        ) {
          console.error(
            "Unexpected notification error:",
            loadError,
          );

          setError(
            "We could not load your notifications.",
          );
        }

        setLoading(false);
      },
      [userId],
    );

  useEffect(() => {
    loadNotifications();
  }, [
    loadNotifications,
  ]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let channel;

    try {
      const suffix =
        Math.random()
          .toString(36)
          .slice(2, 9);

      channel =
        supabase
          .channel(
            `notification-centre-${userId}-${suffix}`,
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "notifications",
              filter:
                `user_id=eq.${userId}`,
            },
            (
              payload,
            ) => {
              const incoming =
                payload.new;

              setNotifications(
                (current) => {
                  const exists =
                    current.some(
                      (
                        notification,
                      ) =>
                        notification.id ===
                        incoming.id,
                    );

                  if (exists) {
                    return current;
                  }

                  return [
                    incoming,
                    ...current,
                  ];
                },
              );
            },
          )
          .subscribe(
            (
              status,
            ) => {
              if (
                status ===
                "CHANNEL_ERROR"
              ) {
                console.error(
                  "Notification realtime channel could not start.",
                );
              }
            },
          );
    } catch (
      realtimeError
    ) {
      console.error(
        "Unable to start notification realtime:",
        realtimeError,
      );
    }

    return () => {
      if (channel) {
        supabase.removeChannel(
          channel,
        );
      }
    };
  }, [
    userId,
  ]);

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    function handleEscape(
      event,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setPanelOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    panelOpen,
  ]);

  async function openNotification(
    notification,
  ) {
    if (
      !notification.read_at
    ) {
      const now =
        new Date().toISOString();

      const {
        error:
          updateError,
      } = await supabase
        .from("notifications")
        .update({
          read_at: now,
        })
        .eq(
          "id",
          notification.id,
        )
        .eq(
          "user_id",
          userId,
        );

      if (updateError) {
        console.error(
          "Unable to mark notification as read:",
          updateError.message,
        );
      } else {
        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      read_at:
                        now,
                    }
                  : item,
            ),
        );
      }
    }

    if (
      notification.link
    ) {
      setPanelOpen(
        false,
      );

      navigate(
        notification.link,
      );
    }
  }

  async function markAllAsRead() {
    if (
      !userId ||
      unreadCount === 0 ||
      actionLoading
    ) {
      return;
    }

    setActionLoading(true);
    setError("");

    const now =
      new Date().toISOString();

    const {
      error:
        updateError,
    } = await supabase
      .from("notifications")
      .update({
        read_at: now,
      })
      .eq(
        "user_id",
        userId,
      )
      .is(
        "read_at",
        null,
      );

    if (updateError) {
      console.error(
        "Unable to mark notifications as read:",
        updateError.message,
      );

      setError(
        "We could not update your notifications.",
      );

      setActionLoading(false);
      return;
    }

    setNotifications(
      (current) =>
        current.map(
          (
            notification,
          ) => ({
            ...notification,
            read_at:
              notification.read_at ||
              now,
          }),
        ),
    );

    setActionLoading(false);
  }

  async function removeNotification(
    notificationId,
    event,
  ) {
    event.stopPropagation();

    const {
      error:
        deleteError,
    } = await supabase
      .from("notifications")
      .delete()
      .eq(
        "id",
        notificationId,
      )
      .eq(
        "user_id",
        userId,
      );

    if (deleteError) {
      console.error(
        "Unable to clear notification:",
        deleteError.message,
      );

      setError(
        "We could not clear that notification.",
      );

      return;
    }

    setNotifications(
      (current) =>
        current.filter(
          (
            notification,
          ) =>
            notification.id !==
            notificationId,
        ),
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={
          panelOpen
        }
        onClick={() =>
          setPanelOpen(
            true,
          )
        }
      >
        <Bell
          size={20}
          strokeWidth={1.8}
        />

        {unreadCount >
          0 && (
          <span className="notification-bell-count">
            {unreadCount >
            99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`notification-panel-overlay${
          panelOpen
            ? " is-open"
            : ""
        }`}
        aria-label="Close notifications"
        tabIndex={
          panelOpen
            ? 0
            : -1
        }
        onClick={() =>
          setPanelOpen(
            false,
          )
        }
      />

      <aside
        className={`notification-panel${
          panelOpen
            ? " is-open"
            : ""
        }`}
        aria-label="Notifications"
      >
        <div className="notification-panel-header">
          <div>
            <span>
              NOTIFICATIONS
            </span>

            <h2>
              Your updates
            </h2>
          </div>

          <button
            type="button"
            className="notification-panel-close"
            aria-label="Close notifications"
            onClick={() =>
              setPanelOpen(
                false,
              )
            }
          >
            <X
              size={19}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="notification-panel-toolbar">
          <p>
            {unreadCount >
            0
              ? `${unreadCount} unread ${
                  unreadCount ===
                  1
                    ? "notification"
                    : "notifications"
                }`
              : "You're all caught up"}
          </p>

          {unreadCount >
            0 && (
            <button
              type="button"
              onClick={
                markAllAsRead
              }
              disabled={
                actionLoading
              }
            >
              <CheckCheck
                size={15}
              />
              Mark all read
            </button>
          )}
        </div>

        {error && (
          <div
            className="notification-panel-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="notification-panel-list">
          {loading ? (
            <div className="notification-panel-empty">
              <div className="loader" />
              <h3>
                Loading notifications
              </h3>
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="notification-panel-empty">
              <span className="notification-panel-empty-icon">
                <Bell
                  size={21}
                />
              </span>

              <h3>
                No notifications yet
              </h3>

              <p>
                New messages and important updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map(
              (
                notification,
              ) => (
                <article
                  key={
                    notification.id
                  }
                  className={`notification-item${
                    notification.read_at
                      ? ""
                      : " is-unread"
                  }`}
                >
                  <button
                    type="button"
                    className="notification-item-main"
                    onClick={() =>
                      openNotification(
                        notification,
                      )
                    }
                  >
                    <span className="notification-item-icon">
                      <MessageCircle
                        size={17}
                      />
                    </span>

                    <span className="notification-item-copy">
                      <span className="notification-item-title-row">
                        <strong>
                          {
                            notification.title
                          }
                        </strong>

                        {!notification.read_at && (
                          <span className="notification-item-unread-dot" />
                        )}
                      </span>

                      {notification.message && (
                        <small className="notification-item-message">
                          {
                            notification.message
                          }
                        </small>
                      )}

                      <small className="notification-item-time">
                        {formatNotificationTime(
                          notification.created_at,
                        )}
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="notification-item-clear"
                    aria-label="Clear notification"
                    title="Clear notification"
                    onClick={(
                      event,
                    ) =>
                      removeNotification(
                        notification.id,
                        event,
                      )
                    }
                  >
                    <X
                      size={15}
                    />
                  </button>
                </article>
              ),
            )
          )}
        </div>
      </aside>
    </>
  );
}

function formatNotificationTime(
  value,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (
    difference >= 0 &&
    difference < minute
  ) {
    return "Just now";
  }

  if (
    difference >=
      minute &&
    difference < hour
  ) {
    return `${Math.floor(
      difference /
        minute,
    )}m ago`;
  }

  if (
    difference >=
      hour &&
    difference < day
  ) {
    return `${Math.floor(
      difference /
        hour,
    )}h ago`;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

export default NotificationBell;
