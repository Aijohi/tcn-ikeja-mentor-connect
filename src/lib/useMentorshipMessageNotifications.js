import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

function useMentorshipMessageNotifications({
  userId,
  role,
}) {
  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    notification,
    setNotification,
  ] = useState(null);

  const hideTimerRef =
    useRef(null);

  const refreshUnreadCount =
    useCallback(
      async () => {
        if (!userId) {
          setUnreadCount(0);
          return;
        }

        const {
          count,
          error,
        } = await supabase
          .from(
            "mentorship_messages",
          )
          .select(
            "id",
            {
              count: "exact",
              head: true,
            },
          )
          .eq(
            "recipient_id",
            userId,
          )
          .is(
            "read_at",
            null,
          );

        if (error) {
          console.error(
            "Unable to load unread mentorship message count:",
            error.message,
          );

          return;
        }

        setUnreadCount(
          count ?? 0,
        );
      },
      [userId],
    );

  const dismissNotification =
    useCallback(
      () => {
        setNotification(
          null,
        );

        if (
          hideTimerRef.current
        ) {
          window.clearTimeout(
            hideTimerRef.current,
          );

          hideTimerRef.current =
            null;
        }
      },
      [],
    );

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setNotification(null);

      return undefined;
    }

    refreshUnreadCount();

    const handleMessagesRead =
      () => {
        refreshUnreadCount();
      };

    window.addEventListener(
      "mentorship:messages-read",
      handleMessagesRead,
    );

    const channel =
      supabase
        .channel(
          `mentorship-message-notifications-${userId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "mentorship_messages",
            filter:
              `recipient_id=eq.${userId}`,
          },
          (
            payload,
          ) => {
            const message =
              payload.new;

            refreshUnreadCount();

            const senderLabel =
              role === "mentor"
                ? "a mentee"
                : "your mentor";

            const body =
              String(
                message?.body ??
                  "",
              ).trim();

            const preview =
              body.length > 88
                ? `${body.slice(
                    0,
                    88,
                  )}…`
                : body;

            setNotification({
              id:
                message?.id ??
                Date.now(),

              title:
                `New message from ${senderLabel}`,

              preview:
                preview ||
                "You received a new mentorship message.",
            });

            if (
              hideTimerRef.current
            ) {
              window.clearTimeout(
                hideTimerRef.current,
              );
            }

            hideTimerRef.current =
              window.setTimeout(
                () => {
                  setNotification(
                    null,
                  );

                  hideTimerRef.current =
                    null;
                },
                6500,
              );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "mentorship_messages",

            filter:
              `recipient_id=eq.${userId}`,
          },
          () => {
            refreshUnreadCount();
          },
        )
        .subscribe();

    return () => {
      window.removeEventListener(
        "mentorship:messages-read",
        handleMessagesRead,
      );

      if (
        hideTimerRef.current
      ) {
        window.clearTimeout(
          hideTimerRef.current,
        );

        hideTimerRef.current =
          null;
      }

      supabase.removeChannel(
        channel,
      );
    };
  }, [
    userId,
    role,
    refreshUnreadCount,
  ]);

  return {
    unreadCount,
    notification,
    dismissNotification,
    refreshUnreadCount,
  };
}

export default useMentorshipMessageNotifications;