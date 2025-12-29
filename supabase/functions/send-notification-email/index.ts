import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

// =============================================================================
// TYPES
// =============================================================================

type NotificationType = "video_date_booked" | "new_message" | "match_received" | "profile_liked";

interface NotificationRequest {
  type: NotificationType;
  recipientId: string;
  senderName?: string;
  scheduledStart?: string;
  duration?: number;
  messagePreview?: string;
}

interface RecipientProfile {
  email: string;
  name: string | null;
  email_notifications_enabled: boolean;
  notify_new_message: boolean;
  notify_video_booking: boolean;
  notify_matches: boolean;
  notify_likes: boolean;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  resendApiKey: Deno.env.get("RESEND_API_KEY"),
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  fromEmail: "Lovable <notifications@resend.dev>",
  appName: "Lovable",
} as const;

// Derive app URL from Supabase URL or use fallback
const getAppUrl = (): string => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) {
    return supabaseUrl.replace(".supabase.co", ".lovable.app");
  }
  return "https://app.lovable.app";
};

// =============================================================================
// LOGGING
// =============================================================================

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const log = (level: LogLevel, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${level}] [SEND-NOTIFICATION-EMAIL] ${step}${detailsStr}`);
};

// =============================================================================
// EMAIL SERVICE
// =============================================================================

class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(to: string, subject: string, html: string): Promise<{ id: string }> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

const emailStyles = {
  // Brand colors
  primaryGradient: "linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #F97316 100%)",
  primaryColor: "#8B5CF6",
  accentColor: "#D946EF",
  textPrimary: "#1a1a2e",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  bgLight: "#faf5ff",
  bgCard: "#ffffff",
  borderColor: "#e9d5ff",

  // Common styles
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const createEmailWrapper = (content: string, appUrl: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${CONFIG.appName}</title>
</head>
<body style="
  font-family: ${emailStyles.fontFamily};
  line-height: 1.6;
  color: ${emailStyles.textPrimary};
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8fafc;
">
  ${content}
  
  <!-- Footer -->
  <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid ${emailStyles.borderColor};">
    <p style="font-size: 12px; color: ${emailStyles.textMuted}; margin: 0 0 8px 0;">
      You received this email because you have notifications enabled.
    </p>
    <a href="${appUrl}/settings" style="
      font-size: 12px;
      color: ${emailStyles.primaryColor};
      text-decoration: none;
    ">Manage notification preferences</a>
    <p style="font-size: 11px; color: ${emailStyles.textMuted}; margin-top: 16px;">
      © ${new Date().getFullYear()} ${CONFIG.appName}. Made with 💜
    </p>
  </div>
</body>
</html>
`;

const createButton = (text: string, href: string): string => `
<a href="${href}" style="
  display: inline-block;
  background: ${emailStyles.primaryGradient};
  color: white;
  padding: 14px 32px;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
  transition: transform 0.2s;
">${text}</a>
`;

const createHeader = (emoji: string, title: string): string => `
<div style="
  background: ${emailStyles.primaryGradient};
  padding: 40px 30px;
  border-radius: 16px 16px 0 0;
  text-align: center;
">
  <div style="font-size: 48px; margin-bottom: 12px;">${emoji}</div>
  <h1 style="
    color: white;
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
  ">${title}</h1>
</div>
`;

const createContentBox = (content: string): string => `
<div style="
  background: ${emailStyles.bgCard};
  padding: 32px;
  border-radius: 0 0 16px 16px;
  border: 1px solid ${emailStyles.borderColor};
  border-top: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
">
  ${content}
</div>
`;

// Template generators for each notification type
const templates: Record<
  NotificationType,
  (data: {
    recipientName: string;
    senderName: string;
    appUrl: string;
    scheduledStart?: string;
    duration?: number;
    messagePreview?: string;
  }) => EmailTemplate
> = {
  video_date_booked: ({ recipientName, senderName, appUrl, scheduledStart, duration }) => {
    const dateTime = scheduledStart ? new Date(scheduledStart) : new Date();
    const formattedDate = dateTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = dateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const content = `
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Hey ${recipientName}! 👋
      </p>
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Great news! <strong style="color: ${emailStyles.primaryColor};">${senderName}</strong> has booked a video date with you!
      </p>
      
      <!-- Date Details Card -->
      <div style="
        background: ${emailStyles.bgLight};
        padding: 24px;
        border-radius: 12px;
        border: 1px solid ${emailStyles.borderColor};
        margin: 24px 0;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 20px; margin-right: 12px;">📅</span>
          <span style="font-size: 16px; color: ${emailStyles.textPrimary};"><strong>Date:</strong> ${formattedDate}</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 20px; margin-right: 12px;">⏰</span>
          <span style="font-size: 16px; color: ${emailStyles.textPrimary};"><strong>Time:</strong> ${formattedTime}</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 12px;">⏱️</span>
          <span style="font-size: 16px; color: ${emailStyles.textPrimary};"><strong>Duration:</strong> ${duration || 30} minutes</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        ${createButton("View Video Dates", `${appUrl}/video-dates`)}
      </div>
      
      <p style="font-size: 14px; color: ${emailStyles.textSecondary}; text-align: center; margin-top: 24px;">
        ✨ Make sure you're camera-ready at the scheduled time!
      </p>
    `;

    return {
      subject: `🎥 ${senderName} booked a video date with you!`,
      html: createEmailWrapper(createHeader("🎥", "Video Date Booked!") + createContentBox(content), appUrl),
    };
  },

  new_message: ({ recipientName, senderName, appUrl, messagePreview }) => {
    const content = `
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Hey ${recipientName}! 👋
      </p>
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        You've got a new message from <strong style="color: ${emailStyles.primaryColor};">${senderName}</strong>!
      </p>
      
      ${
        messagePreview
          ? `
      <div style="
        background: ${emailStyles.bgLight};
        padding: 20px 24px;
        border-radius: 12px;
        border-left: 4px solid ${emailStyles.primaryColor};
        margin: 24px 0;
        font-style: italic;
        color: ${emailStyles.textSecondary};
      ">
        "${messagePreview.length > 100 ? messagePreview.substring(0, 100) + "..." : messagePreview}"
      </div>
      `
          : ""
      }
      
      <div style="text-align: center; margin: 32px 0;">
        ${createButton("Read Message", `${appUrl}/messages`)}
      </div>
      
      <p style="font-size: 14px; color: ${emailStyles.textSecondary}; text-align: center; margin-top: 24px;">
        💬 Don't keep them waiting – reply now!
      </p>
    `;

    return {
      subject: `💬 New message from ${senderName}`,
      html: createEmailWrapper(createHeader("💬", "New Message!") + createContentBox(content), appUrl),
    };
  },

  match_received: ({ recipientName, senderName, appUrl }) => {
    const content = `
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Hey ${recipientName}! 🎉
      </p>
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        You matched with <strong style="color: ${emailStyles.primaryColor};">${senderName}</strong>! 
        This could be the start of something amazing.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        ${createButton("Start Chatting", `${appUrl}/messages`)}
      </div>
      
      <p style="font-size: 14px; color: ${emailStyles.textSecondary}; text-align: center; margin-top: 24px;">
        💜 The feeling is mutual – say hello!
      </p>
    `;

    return {
      subject: `🎉 It's a match with ${senderName}!`,
      html: createEmailWrapper(createHeader("💜", "It's a Match!") + createContentBox(content), appUrl),
    };
  },

  profile_liked: ({ recipientName, senderName, appUrl }) => {
    const content = `
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Hey ${recipientName}! 😊
      </p>
      <p style="font-size: 17px; margin-bottom: 24px; color: ${emailStyles.textPrimary};">
        Someone's got their eye on you! <strong style="color: ${emailStyles.primaryColor};">${senderName}</strong> 
        just liked your profile.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        ${createButton("See Who Likes You", `${appUrl}/likes`)}
      </div>
      
      <p style="font-size: 14px; color: ${emailStyles.textSecondary}; text-align: center; margin-top: 24px;">
        ❤️ Could this be your next connection?
      </p>
    `;

    return {
      subject: `❤️ ${senderName} liked your profile!`,
      html: createEmailWrapper(createHeader("❤️", "You Got a Like!") + createContentBox(content), appUrl),
    };
  },
};

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

const checkNotificationPreference = (
  type: NotificationType,
  recipient: RecipientProfile,
): { allowed: boolean; reason?: string } => {
  // Global notification check
  if (!recipient.email_notifications_enabled) {
    return { allowed: false, reason: "notifications_disabled" };
  }

  // Type-specific checks
  const preferenceMap: Record<NotificationType, { enabled: boolean; reason: string }> = {
    new_message: {
      enabled: recipient.notify_new_message ?? true,
      reason: "message_notifications_disabled",
    },
    video_date_booked: {
      enabled: recipient.notify_video_booking ?? true,
      reason: "booking_notifications_disabled",
    },
    match_received: {
      enabled: recipient.notify_matches ?? true,
      reason: "match_notifications_disabled",
    },
    profile_liked: {
      enabled: recipient.notify_likes ?? true,
      reason: "like_notifications_disabled",
    },
  };

  const preference = preferenceMap[type];
  if (!preference.enabled) {
    return { allowed: false, reason: preference.reason };
  }

  return { allowed: true };
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

const fetchRecipient = async (supabase: SupabaseClient, recipientId: string): Promise<RecipientProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      email,
      name,
      email_notifications_enabled,
      notify_new_message,
      notify_video_booking,
      notify_matches,
      notify_likes
    `,
    )
    .eq("id", recipientId)
    .single();

  if (error) {
    log("ERROR", "Failed to fetch recipient", { error: error.message, recipientId });
    return null;
  }

  return data as RecipientProfile;
};

const createResponse = (data: Record<string, unknown>, status: number, corsHeaders: HeadersInit): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreFlight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    log("INFO", "Function invoked", { method: req.method });

    // Parse request
    const request: NotificationRequest = await req.json();
    const { type, recipientId, senderName = "Someone", scheduledStart, duration, messagePreview } = request;

    log("INFO", "Processing notification", { type, recipientId, senderName });

    // Validate request
    if (!type || !recipientId) {
      return createResponse(
        { success: false, error: "Missing required fields: type and recipientId" },
        400,
        corsHeaders,
      );
    }

    if (!templates[type]) {
      return createResponse({ success: false, error: `Unknown notification type: ${type}` }, 400, corsHeaders);
    }

    // Initialize Supabase client
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch recipient
    const recipient = await fetchRecipient(supabase, recipientId);
    if (!recipient) {
      return createResponse({ success: false, error: "Recipient not found" }, 404, corsHeaders);
    }

    // Check notification preferences
    const { allowed, reason } = checkNotificationPreference(type, recipient);
    if (!allowed) {
      log("INFO", "Notification skipped", { reason, recipientId });
      return createResponse({ success: true, skipped: true, reason }, 200, corsHeaders);
    }

    // Generate email content
    const recipientName = recipient.name?.split(" ")[0] || "there";
    const appUrl = getAppUrl();

    const { subject, html } = templates[type]({
      recipientName,
      senderName,
      appUrl,
      scheduledStart,
      duration,
      messagePreview,
    });

    // Send email
    const emailService = new EmailService(CONFIG.resendApiKey!, CONFIG.fromEmail);

    log("INFO", "Sending email", { to: recipient.email, subject, type });

    const result = await emailService.send(recipient.email, subject, html);

    log("INFO", "Email sent successfully", { emailId: result.id, recipientId });

    return createResponse({ success: true, emailId: result.id }, 200, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", "Function failed", { error: errorMessage });

    return createResponse({ success: false, error: errorMessage }, 500, corsHeaders);
  }
});
