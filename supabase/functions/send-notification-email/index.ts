import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-NOTIFICATION-EMAIL] ${step}${detailsStr}`);
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Notifications <notifications@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
}

interface NotificationRequest {
  type: 'video_date_booked' | 'new_message';
  recipientId: string;
  senderName?: string;
  scheduledStart?: string;
  duration?: number;
}

serve(async (req) => {
  // Handle CORS preflight using shared utility
  const preflightResponse = handleCorsPreFlight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { type, recipientId, senderName, scheduledStart, duration }: NotificationRequest = await req.json();
    
    logStep("Request parsed", { type, recipientId, senderName });

    // Fetch recipient's profile and notification preferences
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("email, name, email_notifications_enabled, notify_new_message, notify_video_booking")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipient) {
      logStep("Recipient not found", { error: recipientError?.message });
      return new Response(JSON.stringify({ success: false, error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if notifications are enabled
    if (!recipient.email_notifications_enabled) {
      logStep("Notifications disabled for user");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "notifications_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check specific notification type preference
    if (type === 'new_message' && !recipient.notify_new_message) {
      logStep("Message notifications disabled");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "message_notifications_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === 'video_date_booked' && !recipient.notify_video_booking) {
      logStep("Video booking notifications disabled");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "booking_notifications_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let htmlContent = "";
    const recipientName = recipient.name?.split(' ')[0] || "there";
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || "https://app.example.com";

    if (type === 'video_date_booked') {
      const dateTime = scheduledStart ? new Date(scheduledStart) : new Date();
      const formattedDate = dateTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
      const formattedTime = dateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      subject = `New Video Date Request from ${senderName || 'Someone'}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎥 New Video Date Request!</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;"><strong>${senderName || 'Someone'}</strong> has booked a video date with you!</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
              <p style="margin: 5px 0;"><strong>⏱️ Duration:</strong> ${duration || 30} minutes</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/video-dates" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Video Dates</a>
            </div>
            <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
              Make sure you're ready at the scheduled time!
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
            You received this email because you have notifications enabled. <br>
            <a href="${appUrl}/settings" style="color: #6366f1;">Manage notification preferences</a>
          </p>
        </body>
        </html>
      `;
    } else if (type === 'new_message') {
      subject = `New message from ${senderName || 'Someone'}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message!</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You have a new message from <strong>${senderName || 'Someone'}</strong>!</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/messages" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Message</a>
            </div>
            <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
              Don't keep them waiting - reply now!
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
            You received this email because you have notifications enabled. <br>
            <a href="${appUrl}/settings" style="color: #6366f1;">Manage notification preferences</a>
          </p>
        </body>
        </html>
      `;
    }

    logStep("Sending email", { to: recipient.email, subject });

    const emailResponse = await sendEmail(recipient.email, subject, htmlContent);

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
