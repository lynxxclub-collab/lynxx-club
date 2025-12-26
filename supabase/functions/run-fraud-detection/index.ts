import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  'https://lynxxclub.com',
  'https://www.lynxxclub.com',
  'https://app.lynxxclub.com',
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  let allowedOrigin = '';
  
  if (origin) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (typeof allowed === 'string' && origin === allowed) {
        allowedOrigin = origin;
        break;
      } else if (allowed instanceof RegExp && allowed.test(origin)) {
        allowedOrigin = origin;
        break;
      }
    }
  }
  
  if (!allowedOrigin && origin) {
    console.warn(`CORS: Origin not in allowed list: ${origin}`);
    allowedOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://lynxxclub.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

interface FraudFlag {
  type: string;
  severity: string;
  description: string;
  points: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const storyId = validateUUID(body.storyId, 'storyId');

    // Create service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Verify user is part of the success story
    const { data: storyCheck, error: storyCheckError } = await supabase
      .from("success_stories")
      .select("initiator_id, partner_id")
      .eq("id", storyId)
      .single();

    if (storyCheckError || !storyCheck) {
      return new Response(
        JSON.stringify({ error: "Story not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (storyCheck.initiator_id !== user.id && storyCheck.partner_id !== user.id) {
      console.error("Unauthorized access attempt to story:", storyId, "by user:", user.id);
      return new Response(
        JSON.stringify({ error: "You are not authorized to trigger fraud detection on this story" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authorized fraud detection for story:", storyId, "by user:", user.id);

    // Fetch the story with related data
    const { data: story, error: storyError } = await supabase
      .from("success_stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      return new Response(
        JSON.stringify({ error: "Story not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch initiator and partner profiles
    const { data: initiator } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", story.initiator_id)
      .single();

    const { data: partner } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", story.partner_id)
      .single();

    if (!initiator || !partner) {
      return new Response(
        JSON.stringify({ error: "User profiles not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fraudScore = 0;
    const fraudFlags: FraudFlag[] = [];

    // CHECK 1: Accounts created within 7 days of each other (MEDIUM - 60 points)
    const initiatorCreated = new Date(initiator.created_at);
    const partnerCreated = new Date(partner.created_at);
    const daysBetweenAccounts = Math.abs(
      initiatorCreated.getTime() - partnerCreated.getTime()
    ) / (1000 * 60 * 60 * 24);

    if (daysBetweenAccounts < 7) {
      fraudScore += 60;
      fraudFlags.push({
        type: "accounts_created_together",
        severity: "MEDIUM",
        description: `Accounts created ${daysBetweenAccounts.toFixed(1)} days apart`,
        points: 60,
      });
    }

    // CHECK 2: Only talked to each other (HIGH - 70 points)
    const { count: initiatorConvs } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .or(`seeker_id.eq.${story.initiator_id},earner_id.eq.${story.initiator_id}`);

    const { count: partnerConvs } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .or(`seeker_id.eq.${story.partner_id},earner_id.eq.${story.partner_id}`);

    if ((initiatorConvs || 0) <= 1 || (partnerConvs || 0) <= 1) {
      fraudScore += 70;
      fraudFlags.push({
        type: "only_talked_to_each_other",
        severity: "HIGH",
        description: `One or both users only have 1 conversation (initiator: ${initiatorConvs}, partner: ${partnerConvs})`,
        points: 70,
      });
    }

    // CHECK 3: Low message count (MEDIUM - 50 points)
    // Find conversation between the two users
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(seeker_id.eq.${story.initiator_id},earner_id.eq.${story.partner_id}),` +
        `and(seeker_id.eq.${story.partner_id},earner_id.eq.${story.initiator_id})`
      )
      .single();

    if (conversation) {
      if (conversation.total_messages < 20) {
        fraudScore += 50;
        fraudFlags.push({
          type: "few_messages",
          severity: "MEDIUM",
          description: `Only ${conversation.total_messages} messages exchanged`,
          points: 50,
        });
      }
    } else {
      // No conversation found - very suspicious
      fraudScore += 100;
      fraudFlags.push({
        type: "no_conversation",
        severity: "CRITICAL",
        description: "No conversation found between users",
        points: 100,
      });
    }

    // CHECK 4: No video dates (MEDIUM - 60 points)
    const { count: videoDateCount } = await supabase
      .from("video_dates")
      .select("*", { count: "exact", head: true })
      .or(
        `and(seeker_id.eq.${story.initiator_id},earner_id.eq.${story.partner_id}),` +
        `and(seeker_id.eq.${story.partner_id},earner_id.eq.${story.initiator_id})`
      )
      .eq("status", "completed");

    if ((videoDateCount || 0) === 0) {
      fraudScore += 60;
      fraudFlags.push({
        type: "no_video_dates",
        severity: "MEDIUM",
        description: "No video dates completed between users",
        points: 60,
      });
    }

    // CHECK 5: Photos don't match (HIGH - 80 points)
    // Simple check - compare if both uploaded photos exist and have similar names
    if (story.initiator_photo_url && story.partner_photo_url) {
      const initiatorFileName = story.initiator_photo_url.split("/").pop() || "";
      const partnerFileName = story.partner_photo_url.split("/").pop() || "";

      // Check similarity using Levenshtein distance
      const similarity = calculateStringSimilarity(initiatorFileName, partnerFileName);
      
      if (similarity < 0.5) {
        fraudScore += 80;
        fraudFlags.push({
          type: "photos_dont_match",
          severity: "HIGH",
          description: "Uploaded couple photos appear to be different",
          points: 80,
        });
      }
    }

    // CHECK 6: New accounts (less than 14 days old) (MEDIUM - 40 points)
    const now = new Date();
    const initiatorAge = (now.getTime() - initiatorCreated.getTime()) / (1000 * 60 * 60 * 24);
    const partnerAge = (now.getTime() - partnerCreated.getTime()) / (1000 * 60 * 60 * 24);

    if (initiatorAge < 14 || partnerAge < 14) {
      fraudScore += 40;
      fraudFlags.push({
        type: "new_accounts",
        severity: "MEDIUM",
        description: `One or both accounts less than 14 days old (initiator: ${Math.floor(initiatorAge)} days, partner: ${Math.floor(partnerAge)} days)`,
        points: 40,
      });
    }

    // CHECK 7: Same location (LOW - 20 points if exact match)
    if (initiator.location_city && partner.location_city && 
        initiator.location_city === partner.location_city &&
        initiator.location_state === partner.location_state) {
      // Same location is slightly suspicious but not conclusive
      fraudScore += 20;
      fraudFlags.push({
        type: "same_location",
        severity: "LOW",
        description: `Both users from ${initiator.location_city}, ${initiator.location_state}`,
        points: 20,
      });
    }

    // Determine risk level
    let fraudRisk: string;
    if (fraudScore >= 200) {
      fraudRisk = "HIGH";
    } else if (fraudScore >= 100) {
      fraudRisk = "MEDIUM";
    } else {
      fraudRisk = "LOW";
    }

    // Update success story with fraud data
    await supabase
      .from("success_stories")
      .update({
        fraud_score: fraudScore,
        fraud_risk: fraudRisk,
        fraud_flags: fraudFlags,
      })
      .eq("id", storyId);

    // Determine status based on fraud risk
    let newStatus: string;
    let message: string;

    if (fraudRisk === "HIGH") {
      newStatus = "rejected_fraud";
      message = "Your submission was flagged for review and could not be approved at this time.";

      // Create fraud flags in the fraud_flags table for both users
      await supabase.from("fraud_flags").insert([
        {
          user_id: story.initiator_id,
          flag_type: "success_story_fraud",
          severity: "HIGH",
          reason: "High fraud score on success story submission",
          details: { story_id: storyId, fraud_score: fraudScore, flags: fraudFlags },
        },
        {
          user_id: story.partner_id,
          flag_type: "success_story_fraud",
          severity: "HIGH",
          reason: "High fraud score on success story submission",
          details: { story_id: storyId, fraud_score: fraudScore, flags: fraudFlags },
        },
      ]);
    } else if (fraudRisk === "MEDIUM") {
      newStatus = "pending_review";
      message = "Your submission is under review. You'll be notified within 1-2 weeks.";
    } else {
      newStatus = "approved";
      message = "Approved! You'll receive your gift card within 14 days.";

      // Grant alumni access (set a flag or extend subscription)
      await supabase
        .from("success_stories")
        .update({ alumni_access_granted: true })
        .eq("id", storyId);
    }

    // Update the status
    await supabase
      .from("success_stories")
      .update({ status: newStatus })
      .eq("id", storyId);

    return new Response(
      JSON.stringify({
        success: true,
        fraudScore,
        fraudRisk,
        fraudFlags,
        status: newStatus,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Fraud detection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
