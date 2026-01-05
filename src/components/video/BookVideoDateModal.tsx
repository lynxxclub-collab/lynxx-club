const handleBook = async () => {
  if (!user || !selectedDate || !selectedTime) return;

  // Fresh wallet balance check before any database operations
  const { data: freshWallet, error: walletError } = await supabase
    .from("wallets")
    .select("credit_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError || !freshWallet || freshWallet.credit_balance < creditsNeeded) {
    setShowLowBalance(true);
    return;
  }

  const validationError = validateBooking();
  if (validationError) {
    toast.error(validationError);
    return;
  }

  setLoading(true);
  try {
    const [hours, mins] = selectedTime.split(":").map(Number);
    const scheduledStart = setMinutes(setHours(selectedDate, hours), mins);
    const platformFee = calculatePlatformFee(creditsNeeded);

    // Calculate credits per minute for snapshotting (for proration)
    const creditsPerMinute = creditsNeeded / parseInt(duration);

    // Create video date record with 'draft' status (invisible to earner)
    const { data: videoDate, error: insertError } = await supabase
      .from("video_dates")
      .insert({
        conversation_id: conversationId,
        seeker_id: user.id,
        earner_id: earnerId,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_duration: parseInt(duration),
        credits_reserved: creditsNeeded,
        earner_amount: earnerAmount,
        platform_fee: platformFee,
        call_type: callType,
        credits_per_minute: creditsPerMinute,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Reserve credits using the database function
    const { data: reserveResult, error: reserveError } = await supabase.rpc("reserve_credits_for_video_date", {
      p_user_id: user.id,
      p_video_date_id: videoDate.id,
      p_credits_amount: creditsNeeded,
    });

    const reserveData = reserveResult as { success: boolean; error?: string; new_balance?: number } | null;

    if (reserveError || !reserveData?.success) {
      // Delete the draft video date if reservation failed
      await supabase.from("video_dates").delete().eq("id", videoDate.id);
      throw new Error(reserveData?.error || "Failed to reserve credits");
    }

    // Get auth session for function calls
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
      await supabase.from("video_dates").delete().eq("id", videoDate.id);
      toast.error("Session expired. Please log in again.");
      return;
    }

    // Create Daily.co room BEFORE making booking visible
    const roomResult = await supabase.functions.invoke("create-daily-room", {
      body: { 
        videoDateId: videoDate.id, 
        callType,
        waitingRoom: true,
        autoStart: false,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const roomError = getFunctionErrorMessage(roomResult, "Failed to create video room");
    if (roomError) {
      // Refund credits and delete the video date
      await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
      await supabase.from("video_dates").delete().eq("id", videoDate.id);
      throw new Error(roomError);
    }

    console.log("Daily.co room created:", roomResult.data?.roomUrl);

    // Credits reserved and room created successfully - now make visible to earner
    const { error: updateError } = await supabase
      .from("video_dates")
      .update({ status: "pending" })
      .eq("id", videoDate.id);

    if (updateError) {
      // Rollback: release credits and delete draft
      await supabase.rpc("release_credit_reservation", { p_video_date_id: videoDate.id });
      await supabase.from("video_dates").delete().eq("id", videoDate.id);
      throw new Error("Failed to finalize booking");
    }

    // Send email notification to earner
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: {
          type: "video_date_booked",
          recipientId: earnerId,
          senderName: profile?.name || "Someone",
          scheduledStart: scheduledStart.toISOString(),
          duration: parseInt(duration),
        },
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    toast.success(`Video date booked with ${earnerName}!`, {
      description: `${formatInTimeZone(scheduledStart, "America/New_York", "EEEE, MMMM d")} at ${formatInTimeZone(scheduledStart, "America/New_York", "h:mm a")} EST`,
    });

    onOpenChange(false);
    resetForm();
  } catch (error: any) {
    console.error("Booking error:", error);
    toast.error(error.message || "Failed to book video date");
  } finally {
    setLoading(false);
  }
};
