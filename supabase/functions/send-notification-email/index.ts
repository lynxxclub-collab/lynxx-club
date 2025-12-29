// supabase/functions/send-notification-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "video_date_booked" | "video_date_reminder" | "video_date_starting" | "message_received";
  recipientId: string;
  senderName?: string;
  scheduledStart?: string;
  duration?: number;
  videoDateId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { type, recipientId, senderName, scheduledStart, duration, videoDateId }: NotificationRequest =
      await req.json();

    // Get recipient profile
    const { data: recipient, error: recipientError } = await supabaseClient
      .from("profiles")
      .select("id, name, email, notification_preferences")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipient) {
      throw new Error("Recipient not found");
    }

    // Check notification preferences
    const prefs = recipient.notification_preferences || { email: true, push: true };

    // Build notification content based on type
    let subject = "";
    let body = "";
    let pushTitle = "";
    let pushBody = "";

    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    switch (type) {
      case "video_date_booked":
        subject = `📹 New Video Date Request from ${senderName}`;
        pushTitle = "📹 New Video Date Request";
        pushBody = `${senderName} wants to schedule a ${duration}-minute video date with you!`;
        body = `
          <h2>You have a new video date request!</h2>
          <p><strong>${senderName}</strong> wants to schedule a <strong>${duration}-minute</strong> video date with you.</p>
          <p><strong>Scheduled for:</strong> ${scheduledStart ? formatDateTime(scheduledStart) : "TBD"}</p>
          <p>Log in to Lynxx Club to accept or decline this request.</p>
          <a href="${Deno.env.get("SITE_URL") || "https://lynxx.club"}/video-dates" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View Request</a>
        `;
        break;

      case "video_date_reminder":
        subject = `⏰ Video Date Reminder - Starting Soon!`;
        pushTitle = "⏰ Video Date in 15 minutes";
        pushBody = `Your video date with ${senderName} starts soon!`;
        body = `
          <h2>Your video date is starting soon!</h2>
          <p>Your <strong>${duration}-minute</strong> video date with <strong>${senderName}</strong> starts in 15 minutes.</p>
          <p><strong>Scheduled for:</strong> ${scheduledStart ? formatDateTime(scheduledStart) : "Soon"}</p>
          <a href="${Deno.env.get("SITE_URL") || "https://lynxx.club"}/video-call/${videoDateId}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Join Call</a>
        `;
        break;

      case "video_date_starting":
        subject = `🎥 Your Video Date is Starting NOW`;
        pushTitle = "🎥 Video Date Starting";
        pushBody = `${senderName} is waiting for you! Join now.`;
        body = `
          <h2>Your video date is starting!</h2>
          <p><strong>${senderName}</strong> is waiting for you. Click below to join the call.</p>
          <a href="${Deno.env.get("SITE_URL") || "https://lynxx.club"}/video-call/${videoDateId}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Join Now</a>
        `;
        break;

      case "message_received":
        subject = `💬 New message from ${senderName}`;
        pushTitle = "💬 New Message";
        pushBody = `${senderName} sent you a message`;
        body = `
          <h2>You have a new message!</h2>
          <p><strong>${senderName}</strong> sent you a message on Lynxx Club.</p>
          <a href="${Deno.env.get("SITE_URL") || "https://lynxx.club"}/messages" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View Message</a>
        `;
        break;

      default:
        throw new Error("Unknown notification type");
    }

    // Store notification in database for in-app display
    await supabaseClient.from("notifications").insert({
      user_id: recipientId,
      type,
      title: pushTitle,
      body: pushBody,
      data: { senderName, scheduledStart, duration, videoDateId },
      read: false,
    });

    // Send email if enabled
    if (prefs.email && recipient.email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (RESEND_API_KEY) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Lynxx Club <notifications@lynxx.club>",
            to: recipient.email,
            subject,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #8B5CF6; font-size: 24px; margin: 0;">✨ Lynxx Club</h1>
                  </div>
                  ${body}
                  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
                  <p style="font-size: 12px; color: #666; text-align: center;">
                    You're receiving this because you have notifications enabled on Lynxx Club.<br>
                    <a href="${Deno.env.get("SITE_URL") || "https://lynxx.club"}/settings" style="color: #8B5CF6;">Manage preferences</a>
                  </p>
                </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send email:", await emailResponse.text());
        }
      }
    }

    // TODO: Send push notification if enabled
    // This would integrate with Firebase Cloud Messaging, OneSignal, etc.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
