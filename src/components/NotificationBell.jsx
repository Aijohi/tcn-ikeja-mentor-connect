import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  GitPullRequest,
  MessageCircle,
  UserCheck,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./NotificationBell.css";

function NotificationBell({ userId }) {
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read_at,
      ).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select(
          `
            id,
            user_id,
            type,
            title,
            message,
            link,
            read_at,
            created_at
          `,
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (notificationError) {
        console.error(
          "Unable to load notifications:",
          notificationError.message,
        );

        setError("We could not load your notifications.");
        setLoading(false);
        return;
      }

      setNotifications(data ?? []);
    } catch (loadError) {
      console.error(
        "Unexpected notification error:",
        loadError,
      );

      setError("We could not load your notifications.");
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
    Listen for new notifications so the bell count updates
    without requiring a page refresh.
  */
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let channel;

    try {
      const suffix = Math.random()
        .toString(36)
        .slice(2, 9);

      channel = supabase
        .channel(
          `notification-centre-${userId}-${suffix}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const incoming = payload.new;

            setNotifications((current) => {
              const alreadyExists = current.some(
                (notification) =>
                  notification.id === incoming.id,
              );

              if (alreadyExists) {
                return current;
              }

              return [incoming, ...current].slice(0, 50);
            });
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Notification realtime channel could not start.",
            );
          }
        });
    } catch (realtimeError) {
      console.error(
        "Unable to start notification realtime:",
        realtimeError,
      );
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  /*
    Close the notification panel when Escape is pressed.
  */
  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [panelOpen]);

  /*
    Lock the page behind the notification panel.

    The scrollbar width is preserved while the page is locked
    so opening the panel does not cause the dashboard content
    to move horizontally.
  */
  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;

    const previousBodyOverflow =
      body.style.getPropertyValue("overflow");

    const previousBodyOverflowPriority =
      body.style.getPropertyPriority("overflow");

    const previousBodyPaddingRight =
      body.style.getPropertyValue("padding-right");

    const previousBodyPaddingRightPriority =
      body.style.getPropertyPriority("padding-right");

    const previousHtmlOverflow =
      html.style.getPropertyValue("overflow");

    const previousHtmlOverflowPriority =
      html.style.getPropertyPriority("overflow");

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    const computedBodyPaddingRight =
      Number.parseFloat(
        window
          .getComputedStyle(body)
          .paddingRight,
      ) || 0;

    body.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    html.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    if (scrollbarWidth > 0) {
      body.style.setProperty(
        "padding-right",
        `${
          computedBodyPaddingRight +
          scrollbarWidth
        }px`,
        "important",
      );
    }

    return () => {
      restoreInlineStyle(
        body,
        "overflow",
        previousBodyOverflow,
        previousBodyOverflowPriority,
      );

      restoreInlineStyle(
        body,
        "padding-right",
        previousBodyPaddingRight,
        previousBodyPaddingRightPriority,
      );

      restoreInlineStyle(
        html,
        "overflow",
        previousHtmlOverflow,
        previousHtmlOverflowPriority,
      );
    };
  }, [panelOpen]);

  async function openNotification(notification) {
    if (!notification.read_at) {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          read_at: now,
        })
        .eq("id", notification.id)
        .eq("user_id", userId);

      if (updateError) {
        console.error(
          "Unable to mark notification as read:",
          updateError.message,
        );
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read_at: now,
                }
              : item,
          ),
        );
      }
    }

    if (notification.link) {
      setPanelOpen(false);
      navigate(notification.link);
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

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        read_at: now,
      })
      .eq("user_id", userId)
      .is("read_at", null);

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

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at || now,
      })),
    );

    setActionLoading(false);
  }

  async function removeNotification(
    notificationId,
    event,
  ) {
    event.stopPropagation();

    setError("");

    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

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

    setNotifications((current) =>
      current.filter(
        (notification) =>
          notification.id !== notificationId,
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
        aria-controls="notification-panel"
        aria-expanded={panelOpen}
        onClick={() =>
          setPanelOpen((current) => !current)
        }
      >
        <Bell
          size={20}
          strokeWidth={1.8}
        />

        {unreadCount > 0 && (
          <span className="notification-bell-count">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`notification-panel-overlay${
          panelOpen ? " is-open" : ""
        }`}
        aria-label="Close notifications"
        aria-hidden={!panelOpen}
        tabIndex={panelOpen ? 0 : -1}
        onClick={() =>
          setPanelOpen(false)
        }
      />

      <aside
        id="notification-panel"
        className={`notification-panel${
          panelOpen ? " is-open" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        aria-hidden={!panelOpen}
      >
        <div className="notification-panel-header">
          <div>
            <span>NOTIFICATIONS</span>
            <h2>Your updates</h2>
          </div>

          <button
            type="button"
            className="notification-panel-close"
            aria-label="Close notifications"
            onClick={() =>
              setPanelOpen(false)
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
            {unreadCount > 0
              ? `${unreadCount} unread ${
                  unreadCount === 1
                    ? "notification"
                    : "notifications"
                }`
              : "You're all caught up"}
          </p>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={actionLoading}
            >
              <CheckCheck size={15} />

              {actionLoading
                ? "Updating..."
                : "Mark all read"}
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

              <h3>Loading notifications</h3>

              <p>
                Please wait while we get your latest updates.
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-panel-empty">
              <span className="notification-panel-empty-icon">
                <Bell size={21} />
              </span>

              <h3>No notifications yet</h3>

              <p>
                New requests, applications, sessions and
                other important updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
                onRemove={removeNotification}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}

function NotificationItem({
  notification,
  onOpen,
  onRemove,
}) {
  const NotificationIcon = getNotificationIcon(
    notification.type,
  );

  return (
    <article
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
          onOpen(notification)
        }
      >
        <span className="notification-item-icon">
          <NotificationIcon
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="notification-item-copy">
          <span className="notification-item-title-row">
            <strong>
              {notification.title ||
                "New notification"}
            </strong>

            {!notification.read_at && (
              <span
                className="notification-item-unread-dot"
                aria-label="Unread"
              />
            )}
          </span>

          {notification.message && (
            <small className="notification-item-message">
              {notification.message}
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
        aria-label={`Clear ${
          notification.title || "notification"
        }`}
        title="Clear notification"
        onClick={(event) =>
          onRemove(
            notification.id,
            event,
          )
        }
      >
        <X size={15} />
      </button>
    </article>
  );
}

function getNotificationIcon(type) {
  const normalizedType = String(
    type || "",
  )
    .toLowerCase()
    .replaceAll("-", "_");

  if (
    normalizedType.includes("mentor_application") ||
    normalizedType.includes("application")
  ) {
    return ClipboardCheck;
  }

  if (
    normalizedType.includes("mentorship_request") ||
    normalizedType.includes("request")
  ) {
    return GitPullRequest;
  }

  if (
    normalizedType.includes("session") ||
    normalizedType.includes("schedule") ||
    normalizedType.includes("reschedule")
  ) {
    return CalendarDays;
  }

  if (
    normalizedType.includes("membership") ||
    normalizedType.includes("account") ||
    normalizedType.includes("verification")
  ) {
    return UserCheck;
  }

  if (
    normalizedType.includes("message") ||
    normalizedType.includes("chat")
  ) {
    return MessageCircle;
  }

  return Bell;
}

function formatNotificationTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();

  const difference =
    now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (
    difference >= 0 &&
    difference < minute
  ) {
    return "Just now";
  }

  if (
    difference >= minute &&
    difference < hour
  ) {
    return `${Math.floor(
      difference / minute,
    )}m ago`;
  }

  if (
    difference >= hour &&
    difference < day
  ) {
    return `${Math.floor(
      difference / hour,
    )}h ago`;
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function restoreInlineStyle(
  element,
  property,
  value,
  priority,
) {
  if (value) {
    element.style.setProperty(
      property,
      value,
      priority,
    );
  } else {
    element.style.removeProperty(
      property,
    );
  }
}

export default NotificationBell;