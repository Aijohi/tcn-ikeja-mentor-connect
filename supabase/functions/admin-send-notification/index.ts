import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationPayload {
  to?: string;
  subject?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  idempotencyKey?: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(message: string, actionUrl?: string, actionLabel?: string) {
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

  const actionButton =
    actionUrl && actionLabel
      ? `<div style="margin-top:24px;"><a href="${escapeHtml(
          actionUrl,
        )}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#ff5303;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(
          actionLabel,
        )}</a></div>`
      : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#101419;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden;"><tr><td style="padding:22px 28px;background:#101419;color:#ffffff;"><div style="font-size:18px;font-weight:800;">Mentor Connect</div><div style="margin-top:4px;font-size:12px;color:#c8d0d9;">TCN Ikeja</div></td></tr><tr><td style="padding:28px;"><div style="font-size:15px;line-height:1.7;color:#35404b;">${safeMessage}</div>${actionButton}<div style="margin-top:28px;padding-top:18px;border-top:1px solid #edf0f3;font-size:12px;line-height:1.6;color:#7a8795;">This is an automated notification from Mentor Connect.</div></td></tr></table></td></tr></table></body></html>`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const fromName =
    Deno.env.get("RESEND_FROM_NAME") ||
    "Mentor Connect";

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !resendApiKey ||
    !fromEmail
  ) {
    console.error(
      "Missing required server configuration.",
    );

    return jsonResponse(
      {
        error:
          "Email service is not configured.",
      },
      500,
    );
  }

  const authorization =
    req.headers.get("Authorization");

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return jsonResponse(
      {
        error:
          "Authentication is required.",
      },
      401,
    );
  }

  const accessToken =
    authorization
      .replace("Bearer ", "")
      .trim();

  if (!accessToken) {
    return jsonResponse(
      {
        error:
          "Authentication is required.",
      },
      401,
    );
  }

  const supabaseAdmin =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

  const {
    data: userData,
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken,
    );

  if (
    userError ||
    !userData.user
  ) {
    console.error(
      "Unable to authenticate administrator:",
      userError,
    );

    return jsonResponse(
      {
        error:
          "Your session is not valid.",
      },
      401,
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        "id, role, account_status",
      )
      .eq(
        "id",
        userData.user.id,
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Unable to load administrator profile:",
      profileError,
    );

    return jsonResponse(
      {
        error:
          "Unable to verify administrator access.",
      },
      500,
    );
  }

  const role =
    String(
      profile?.role || "",
    ).toLowerCase();

  const allowedRoles =
    new Set([
      "admin",
      "safeguarding_lead",
    ]);

  if (
    !allowedRoles.has(role)
  ) {
    return jsonResponse(
      {
        error:
          "You are not authorised to send administrative emails.",
      },
      403,
    );
  }

  if (
    String(
      profile?.account_status || "",
    ).toLowerCase() ===
    "suspended"
  ) {
    return jsonResponse(
      {
        error:
          "Your administrator account is suspended.",
      },
      403,
    );
  }

  let payload: NotificationPayload;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(
      {
        error:
          "Invalid JSON body.",
      },
      400,
    );
  }

  const to =
    String(
      payload.to || "",
    ).trim();

  const subject =
    String(
      payload.subject || "",
    ).trim();

  const message =
    String(
      payload.message || "",
    ).trim();

  const actionUrl =
    payload.actionUrl
      ? String(
          payload.actionUrl,
        ).trim()
      : undefined;

  const actionLabel =
    payload.actionLabel
      ? String(
          payload.actionLabel,
        ).trim()
      : undefined;

  const idempotencyKey =
    payload.idempotencyKey
      ? String(
          payload.idempotencyKey,
        ).trim()
      : undefined;

  if (
    !isValidEmail(to)
  ) {
    return jsonResponse(
      {
        error:
          "A valid recipient email is required.",
      },
      400,
    );
  }

  if (
    subject.length < 2 ||
    subject.length > 160
  ) {
    return jsonResponse(
      {
        error:
          "Subject must be between 2 and 160 characters.",
      },
      400,
    );
  }

  if (
    message.length < 2 ||
    message.length > 5000
  ) {
    return jsonResponse(
      {
        error:
          "Message must be between 2 and 5000 characters.",
      },
      400,
    );
  }

  if (
    actionUrl &&
    !/^https:\/\//i.test(
      actionUrl,
    )
  ) {
    return jsonResponse(
      {
        error:
          "Action URL must use HTTPS.",
      },
      400,
    );
  }

  const headers: Record<
    string,
    string
  > = {
    Authorization: `Bearer ${resendApiKey}`,
    "Content-Type":
      "application/json",
    "User-Agent":
      "MentorConnect/1.0",
  };

  if (idempotencyKey) {
    headers[
      "Idempotency-Key"
    ] = idempotencyKey;
  }

  try {
    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject,
            html: buildEmailHtml(
              message,
              actionUrl,
              actionLabel,
            ),
          }),
        },
      );

    const result =
      await resendResponse.json();

    if (
      !resendResponse.ok
    ) {
      console.error(
        "Resend rejected administrative email:",
        result,
      );

      return jsonResponse(
        {
          error:
            result?.message ||
            "Unable to send notification email.",
        },
        resendResponse.status,
      );
    }

    return jsonResponse({
      success: true,
      emailId:
        result?.id || null,
    });
  } catch (error) {
    console.error(
      "Unexpected error while sending email:",
      error,
    );

    return jsonResponse(
      {
        error:
          "Unexpected error while sending email.",
      },
      500,
    );
  }
});