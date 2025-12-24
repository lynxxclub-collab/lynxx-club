import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  userId: string;
  type: "approved" | "rejected";
  rejectionNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-verification-email function");

    // Verify the caller is an admin
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided", {
        headerKeys: Array.from(req.headers.keys()),
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized", reason: "missing_authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", reason: "invalid_user", details: userError?.message ?? null }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not an admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, type, rejectionNotes }: VerificationEmailRequest = await req.json();
    console.log(`Processing ${type} email for user ${userId}`);

    // Get user profile using service role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.name || "there";
    const userEmail = profile.email;

    let subject: string;
    let htmlContent: string;

    if (type === "approved") {
      subject = "Your account has been verified! 🎉";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin-bottom: 10px;">✓ Verification Approved!</h1>
          </div>
          
          <p>Hi ${userName},</p>
          
          <p>Great news! Your identity verification has been <strong style="color: #22c55e;">approved</strong>.</p>
          
          <p>You now have full access to all features:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Send and receive messages</li>
            <li>Book video dates</li>
            <li>Your profile is now visible to other verified members</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard" 
               style="display: inline-block; background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          
          <p>Welcome to the community!</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            Best regards,<br>
            The Lynxx Club Team
          </p>
        </body>
        </html>
      `;
    } else {
      subject = "Verification Update Required";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin-bottom: 10px;">Verification Update Needed</h1>
          </div>
          
          <p>Hi ${userName},</p>
          
          <p>Unfortunately, we were unable to verify your identity with the documents you provided.</p>
          
          ${rejectionNotes ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason:</p>
            <p style="margin: 10px 0 0 0; color: #7f1d1d;">${rejectionNotes}</p>
          </div>
          ` : ''}
          
          <p>Don't worry - you can submit new documents after 24 hours. Here are some tips:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Ensure your ID document is clearly visible and not blurry</li>
            <li>Make sure all text on your ID is readable</li>
            <li>For your selfie, hold your ID next to your face in good lighting</li>
            <li>Avoid glare or reflections on your ID</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/verify" 
               style="display: inline-block; background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Try Again
            </a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            Best regards,<br>
            The Lynxx Club Team
          </p>
        </body>
        </html>
      `;
    }

    console.log(`Sending ${type} email to ${userEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Lynxx Club <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
