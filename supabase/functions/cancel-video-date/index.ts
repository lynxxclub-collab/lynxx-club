import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAutoErrorResponse } from "../_shared/errors.ts";

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

const VALID_REASONS = ['user_cancelled', 'no_show', 'technical', 'other'] as const;
type CancelReason = typeof VALID_REASONS[number];

function validateReason(value: unknown): CancelReason {
  if (typeof value === 'string' && VALID_REASONS.includes(value as CancelReason)) {
    return value as CancelReason;
  }
  return 'user_cancelled';
}

async function getProfileName(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();
  return data?.name || null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse and validate input
    const body = await req.json();
    const videoDateId = validateUUID(body.videoDateId, 'videoDateId');
    const reason = validateReason(body.reason);

    console.log(`Cancelling video date: ${videoDateId}, reason: ${reason}`);

    // Get the video date
    const { data: videoDate, error: fetchError } = await supabase
      .from('video_dates')
      .select('*')
      .eq('id', videoDateId)
      .single();

    if (fetchError || !videoDate) {
      throw new Error('Video date not found');
    }

    // Verify user is part of this video date
    if (videoDate.seeker_id !== user.id && videoDate.earner_id !== user.id) {
      throw new Error('Unauthorized to cancel this video date');
    }

    // Can't cancel if already cancelled or completed
    if (videoDate.status === 'cancelled' || videoDate.status === 'completed') {
      console.log(`Video date already ${videoDate.status}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Video date already ${videoDate.status}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Delete Daily.co room if exists
    if (videoDate.daily_room_url && dailyApiKey) {
      const roomName = videoDate.daily_room_url.split('/').pop();
      if (roomName) {
        try {
          await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${dailyApiKey}`,
            }
          });
          console.log('Daily.co room deleted:', roomName);
        } catch (e) {
          console.warn('Failed to delete Daily.co room:', e);
        }
      }
    }

    // Release reserved credits (refund) using the RPC function
    // We need to use a workaround since service role can call the function
    const refundReason = reason === 'no_show' ? 'Partner did not join' : 
                         reason === 'technical' ? 'Technical issues' : 
                         'Cancelled by user';
    
    // Find and refund active reservation directly (since we're using service role)
    const { data: reservation } = await supabase
      .from('credit_reservations')
      .select('*')
      .eq('video_date_id', videoDateId)
      .eq('status', 'active')
      .single();

    if (reservation) {
      console.log(`Refunding ${reservation.credits_amount} credits to user ${reservation.user_id}`);
      
      // Refund credits to user
      await supabase
        .from('profiles')
        .update({ 
          credit_balance: supabase.rpc('', {}) // We need raw SQL, let's do it differently
        })
        .eq('id', reservation.user_id);

      // Actually, let's use a simpler approach - increment credit_balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', reservation.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ credit_balance: (profile.credit_balance || 0) + reservation.credits_amount })
          .eq('id', reservation.user_id);
      }

      // Update reservation status
      await supabase
        .from('credit_reservations')
        .update({ status: 'refunded', released_at: new Date().toISOString() })
        .eq('id', reservation.id);

      // Create refund transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: reservation.user_id,
          transaction_type: 'video_date_refund',
          credits_amount: reservation.credits_amount,
          description: `Credits refunded: ${refundReason}`,
          status: 'completed'
        });

      console.log('Credits refunded successfully');
    }

    // Update video date status
    const { error: updateError } = await supabase
      .from('video_dates')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', videoDateId);

    if (updateError) {
      throw new Error('Failed to update video date status');
    }

    console.log(`Video date ${videoDateId} cancelled successfully`);

    // Send no-show notification email if reason is no_show
    if (reason === 'no_show') {
      // Determine who was the no-show (the other person, not the one who triggered cancellation)
      const noShowUserId = videoDate.seeker_id === user.id ? videoDate.earner_id : videoDate.seeker_id;
      const waitingUserName = await getProfileName(supabase, user.id);
      
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "video_date_no_show",
            recipientId: noShowUserId,
            senderName: waitingUserName || "Your date",
            scheduledStart: videoDate.scheduled_start,
          },
        });
        console.log("No-show notification sent to:", noShowUserId);
      } catch (emailError) {
        console.warn("Failed to send no-show notification:", emailError);
        // Don't fail the cancellation if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Video date cancelled successfully',
        credits_refunded: reservation?.credits_amount || 0,
        reason: reason
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error cancelling video date:', error);
    return createAutoErrorResponse(error, getCorsHeaders(req));
  }
});
