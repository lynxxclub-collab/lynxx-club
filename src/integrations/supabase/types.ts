export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_type_switches: {
        Row: {
          effective_at: string | null
          from_type: string
          id: string
          requested_at: string
          status: string
          to_type: string
          user_id: string
        }
        Insert: {
          effective_at?: string | null
          from_type: string
          id?: string
          requested_at?: string
          status?: string
          to_type: string
          user_id: string
        }
        Update: {
          effective_at?: string | null
          from_type?: string
          id?: string
          requested_at?: string
          status?: string
          to_type?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          earner_id: string
          id: string
          last_message_at: string | null
          payer_user_id: string | null
          seeker_id: string
          total_credits_spent: number
          total_messages: number
        }
        Insert: {
          created_at?: string
          earner_id: string
          id?: string
          last_message_at?: string | null
          payer_user_id?: string | null
          seeker_id: string
          total_credits_spent?: number
          total_messages?: number
        }
        Update: {
          created_at?: string
          earner_id?: string
          id?: string
          last_message_at?: string | null
          payer_user_id?: string | null
          seeker_id?: string
          total_credits_spent?: number
          total_messages?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          active: boolean | null
          badge: string | null
          bonus_credits: number | null
          created_at: string | null
          credits: number
          id: string
          name: string
          price_cents: number
          stripe_price_id: string
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          bonus_credits?: number | null
          created_at?: string | null
          credits: number
          id?: string
          name: string
          price_cents: number
          stripe_price_id: string
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          bonus_credits?: number | null
          created_at?: string | null
          credits?: number
          id?: string
          name?: string
          price_cents?: number
          stripe_price_id?: string
        }
        Relationships: []
      }
      credit_reservations: {
        Row: {
          credits_amount: number
          id: string
          released_at: string | null
          reserved_at: string | null
          status: string
          user_id: string
          video_date_id: string
        }
        Insert: {
          credits_amount: number
          id?: string
          released_at?: string | null
          reserved_at?: string | null
          status?: string
          user_id: string
          video_date_id: string
        }
        Update: {
          credits_amount?: number
          id?: string
          released_at?: string | null
          reserved_at?: string | null
          status?: string
          user_id?: string
          video_date_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_reservations_video_date_id_fkey"
            columns: ["video_date_id"]
            isOneToOne: false
            referencedRelation: "video_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      earner_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earner_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earner_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          action_taken: string | null
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          reason: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          reason: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          reason?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_catalog: {
        Row: {
          active: boolean | null
          animation_type: string
          created_at: string | null
          credits_cost: number
          description: string | null
          emoji: string
          id: string
          is_seasonal: boolean | null
          name: string
          season_tag: string | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          animation_type?: string
          created_at?: string | null
          credits_cost: number
          description?: string | null
          emoji: string
          id?: string
          is_seasonal?: boolean | null
          name: string
          season_tag?: string | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          animation_type?: string
          created_at?: string | null
          credits_cost?: number
          description?: string | null
          emoji?: string
          id?: string
          is_seasonal?: boolean | null
          name?: string
          season_tag?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          credits_spent: number
          earner_amount: number
          gift_id: string
          id: string
          message: string | null
          platform_fee: number
          recipient_id: string
          sender_id: string
          thank_you_reaction: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          credits_spent: number
          earner_amount: number
          gift_id: string
          id?: string
          message?: string | null
          platform_fee: number
          recipient_id: string
          sender_id: string
          thank_you_reaction?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          credits_spent?: number
          earner_amount?: number
          gift_id?: string
          id?: string
          message?: string | null
          platform_fee?: number
          recipient_id?: string
          sender_id?: string
          thank_you_reaction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_gifters: {
        Row: {
          created_at: string | null
          creator_id: string
          gifter_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          gifter_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          gifter_id?: string
          id?: string
        }
        Relationships: []
      }
      image_unlocks: {
        Row: {
          created_at: string | null
          credits_spent: number
          id: string
          message_id: string
          unlocked_by: string
        }
        Insert: {
          created_at?: string | null
          credits_spent?: number
          id?: string
          message_id: string
          unlocked_by: string
        }
        Update: {
          created_at?: string | null
          credits_spent?: number
          id?: string
          message_id?: string
          unlocked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_unlocks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_promotions: {
        Row: {
          bonus_credits: number | null
          claimed_at: string | null
          created_at: string | null
          featured_until: string | null
          id: string
          promotion_type: string
          user_id: string
          user_type: string
        }
        Insert: {
          bonus_credits?: number | null
          claimed_at?: string | null
          created_at?: string | null
          featured_until?: string | null
          id?: string
          promotion_type: string
          user_id: string
          user_type: string
        }
        Update: {
          bonus_credits?: number | null
          claimed_at?: string | null
          created_at?: string | null
          featured_until?: string | null
          id?: string
          promotion_type?: string
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_signups: {
        Row: {
          claimed_at: string
          id: string
          signup_number: number
          user_id: string
          user_type: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          signup_number: number
          user_id: string
          user_type: string
        }
        Update: {
          claimed_at?: string
          id?: string
          signup_number?: number
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      leaderboard_nudges: {
        Row: {
          creator_id: string
          id: string
          nudge_type: string
          session_id: string
          shown_at: string | null
          user_id: string
        }
        Insert: {
          creator_id: string
          id?: string
          nudge_type?: string
          session_id: string
          shown_at?: string | null
          user_id: string
        }
        Update: {
          creator_id?: string
          id?: string
          nudge_type?: string
          session_id?: string
          shown_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          created_at: string | null
          credits_delta: number | null
          description: string | null
          entry_type: string
          id: string
          reference_id: string | null
          reference_type: string | null
          usd_delta: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_delta?: number | null
          description?: string | null
          entry_type: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          usd_delta?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_delta?: number | null
          description?: string | null
          entry_type?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          usd_delta?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          billed_at: string | null
          content: string
          conversation_id: string
          created_at: string
          credits_cost: number
          earner_amount: number
          id: string
          is_billable_volley: boolean | null
          message_type: string
          platform_fee: number
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          billed_at?: string | null
          content: string
          conversation_id: string
          created_at?: string
          credits_cost: number
          earner_amount: number
          id?: string
          is_billable_volley?: boolean | null
          message_type?: string
          platform_fee: number
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          billed_at?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          credits_cost?: number
          earner_amount?: number
          id?: string
          is_billable_volley?: boolean | null
          message_type?: string
          platform_fee?: number
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nudge_events: {
        Row: {
          clicked_at: string | null
          conversation_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          nudge_type: string
          purchased_at: string | null
          shown_at: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          conversation_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          nudge_type: string
          purchased_at?: string | null
          shown_at?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          conversation_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          nudge_type?: string
          purchased_at?: string | null
          shown_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudge_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_likes: {
        Row: {
          created_at: string
          id: string
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          alumni_access_expires: string | null
          auto_thank_you_enabled: boolean | null
          average_rating: number | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          can_reverify_at: string | null
          created_at: string | null
          credit_balance: number | null
          date_of_birth: string | null
          earnings_balance: number | null
          email: string
          email_notifications_enabled: boolean | null
          exit_reason: string | null
          featured_until: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          gender_preference: Database["public"]["Enums"]["gender"][] | null
          gifting_onboarding_completed: boolean | null
          gifting_onboarding_completed_at: string | null
          height: string | null
          hobbies: string[] | null
          id: string
          id_document_type: string | null
          id_document_url: string | null
          interests: string[] | null
          is_featured: boolean | null
          last_reactivated_at: string | null
          leaderboard_enabled: boolean | null
          location_city: string | null
          location_state: string | null
          mute_gift_animations: boolean | null
          name: string | null
          notify_likes: boolean | null
          notify_new_message: boolean | null
          notify_payouts: boolean | null
          notify_video_booking: boolean | null
          onboarding_step: number | null
          paused_date: string | null
          pending_balance: number | null
          premium_animation_limit: number | null
          profile_photos: string[] | null
          push_subscription: Json | null
          reactivation_count: number | null
          reactivation_eligible_date: string | null
          selfie_url: string | null
          show_daily_leaderboard: boolean | null
          stripe_account_id: string | null
          stripe_onboarded_at: string | null
          stripe_onboarding_complete: boolean | null
          suspend_until: string | null
          total_ratings: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          verification_attempts: number | null
          verification_notes: string | null
          verification_status: string | null
          verification_submitted_at: string | null
          verified_at: string | null
          verified_by_admin_id: string | null
          video_15min_rate: number | null
          video_30min_rate: number | null
          video_60min_rate: number | null
          video_90min_rate: number | null
        }
        Insert: {
          account_status?: string | null
          alumni_access_expires?: string | null
          auto_thank_you_enabled?: boolean | null
          average_rating?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          can_reverify_at?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email: string
          email_notifications_enabled?: boolean | null
          exit_reason?: string | null
          featured_until?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          gifting_onboarding_completed?: boolean | null
          gifting_onboarding_completed_at?: string | null
          height?: string | null
          hobbies?: string[] | null
          id: string
          id_document_type?: string | null
          id_document_url?: string | null
          interests?: string[] | null
          is_featured?: boolean | null
          last_reactivated_at?: string | null
          leaderboard_enabled?: boolean | null
          location_city?: string | null
          location_state?: string | null
          mute_gift_animations?: boolean | null
          name?: string | null
          notify_likes?: boolean | null
          notify_new_message?: boolean | null
          notify_payouts?: boolean | null
          notify_video_booking?: boolean | null
          onboarding_step?: number | null
          paused_date?: string | null
          pending_balance?: number | null
          premium_animation_limit?: number | null
          profile_photos?: string[] | null
          push_subscription?: Json | null
          reactivation_count?: number | null
          reactivation_eligible_date?: string | null
          selfie_url?: string | null
          show_daily_leaderboard?: boolean | null
          stripe_account_id?: string | null
          stripe_onboarded_at?: string | null
          stripe_onboarding_complete?: boolean | null
          suspend_until?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_attempts?: number | null
          verification_notes?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          video_15min_rate?: number | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
          video_90min_rate?: number | null
        }
        Update: {
          account_status?: string | null
          alumni_access_expires?: string | null
          auto_thank_you_enabled?: boolean | null
          average_rating?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          can_reverify_at?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email?: string
          email_notifications_enabled?: boolean | null
          exit_reason?: string | null
          featured_until?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          gifting_onboarding_completed?: boolean | null
          gifting_onboarding_completed_at?: string | null
          height?: string | null
          hobbies?: string[] | null
          id?: string
          id_document_type?: string | null
          id_document_url?: string | null
          interests?: string[] | null
          is_featured?: boolean | null
          last_reactivated_at?: string | null
          leaderboard_enabled?: boolean | null
          location_city?: string | null
          location_state?: string | null
          mute_gift_animations?: boolean | null
          name?: string | null
          notify_likes?: boolean | null
          notify_new_message?: boolean | null
          notify_payouts?: boolean | null
          notify_video_booking?: boolean | null
          onboarding_step?: number | null
          paused_date?: string | null
          pending_balance?: number | null
          premium_animation_limit?: number | null
          profile_photos?: string[] | null
          push_subscription?: Json | null
          reactivation_count?: number | null
          reactivation_eligible_date?: string | null
          selfie_url?: string | null
          show_daily_leaderboard?: boolean | null
          stripe_account_id?: string | null
          stripe_onboarded_at?: string | null
          stripe_onboarding_complete?: boolean | null
          suspend_until?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_attempts?: number | null
          verification_notes?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          video_15min_rate?: number | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
          video_90min_rate?: number | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          conversation_id: string | null
          conversation_quality: number | null
          created_at: string
          id: string
          overall_rating: number
          punctuality: number | null
          rated_id: string
          rater_id: string
          respect_boundaries: number | null
          review_text: string | null
          video_date_id: string | null
          would_interact_again: boolean | null
        }
        Insert: {
          conversation_id?: string | null
          conversation_quality?: number | null
          created_at?: string
          id?: string
          overall_rating: number
          punctuality?: number | null
          rated_id: string
          rater_id: string
          respect_boundaries?: number | null
          review_text?: string | null
          video_date_id?: string | null
          would_interact_again?: boolean | null
        }
        Update: {
          conversation_id?: string | null
          conversation_quality?: number | null
          created_at?: string
          id?: string
          overall_rating?: number
          punctuality?: number | null
          rated_id?: string
          rater_id?: string
          respect_boundaries?: number | null
          review_text?: string | null
          video_date_id?: string | null
          would_interact_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_video_date_id_fkey"
            columns: ["video_date_id"]
            isOneToOne: false
            referencedRelation: "video_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      saved_profiles: {
        Row: {
          created_at: string | null
          id: string
          saved_profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          saved_profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          saved_profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_profiles_saved_profile_id_fkey"
            columns: ["saved_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_saved_profile_id_fkey"
            columns: ["saved_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_gift_cards: {
        Row: {
          created_at: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          success_story_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          success_story_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          success_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_gift_cards_success_story_id_fkey"
            columns: ["success_story_id"]
            isOneToOne: false
            referencedRelation: "success_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      success_stories: {
        Row: {
          alumni_access_granted: boolean | null
          created_at: string | null
          days_until_first_date: number | null
          featured: boolean | null
          first_date_type: string | null
          fraud_flags: Json | null
          fraud_risk: string | null
          fraud_score: number | null
          gift_cards_sent: boolean | null
          helpful_features: Json | null
          how_met: string | null
          how_we_met: string | null
          id: string
          improvement_suggestions: string | null
          initiator_gift_card_email: string | null
          initiator_id: string
          initiator_photo_url: string | null
          initiator_survey_completed: boolean | null
          partner_confirmation_expires_at: string
          partner_confirmed_at: string | null
          partner_gift_card_email: string | null
          partner_id: string
          partner_photo_url: string | null
          partner_survey_completed: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          share_anonymously: boolean | null
          share_story: boolean | null
          status: string
          story_text: string
          survey_completed_at: string | null
          updated_at: string | null
        }
        Insert: {
          alumni_access_granted?: boolean | null
          created_at?: string | null
          days_until_first_date?: number | null
          featured?: boolean | null
          first_date_type?: string | null
          fraud_flags?: Json | null
          fraud_risk?: string | null
          fraud_score?: number | null
          gift_cards_sent?: boolean | null
          helpful_features?: Json | null
          how_met?: string | null
          how_we_met?: string | null
          id?: string
          improvement_suggestions?: string | null
          initiator_gift_card_email?: string | null
          initiator_id: string
          initiator_photo_url?: string | null
          initiator_survey_completed?: boolean | null
          partner_confirmation_expires_at: string
          partner_confirmed_at?: string | null
          partner_gift_card_email?: string | null
          partner_id: string
          partner_photo_url?: string | null
          partner_survey_completed?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_anonymously?: boolean | null
          share_story?: boolean | null
          status?: string
          story_text: string
          survey_completed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          alumni_access_granted?: boolean | null
          created_at?: string | null
          days_until_first_date?: number | null
          featured?: boolean | null
          first_date_type?: string | null
          fraud_flags?: Json | null
          fraud_risk?: string | null
          fraud_score?: number | null
          gift_cards_sent?: boolean | null
          helpful_features?: Json | null
          how_met?: string | null
          how_we_met?: string | null
          id?: string
          improvement_suggestions?: string | null
          initiator_gift_card_email?: string | null
          initiator_id?: string
          initiator_photo_url?: string | null
          initiator_survey_completed?: boolean | null
          partner_confirmation_expires_at?: string
          partner_confirmed_at?: string | null
          partner_gift_card_email?: string | null
          partner_id?: string
          partner_photo_url?: string | null
          partner_survey_completed?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_anonymously?: boolean | null
          share_story?: boolean | null
          status?: string
          story_text?: string
          survey_completed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          credits_amount: number
          description: string | null
          id: string
          status: string
          stripe_payment_id: string | null
          transaction_type: string
          usd_amount: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_amount: number
          description?: string | null
          id?: string
          status?: string
          stripe_payment_id?: string | null
          transaction_type: string
          usd_amount?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          description?: string | null
          id?: string
          status?: string
          stripe_payment_id?: string | null
          transaction_type?: string
          usd_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_dates: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          cancelled_at: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          credits_charged: number | null
          credits_reserved: number
          daily_room_url: string | null
          earner_amount: number
          earner_id: string
          earner_meeting_token: string | null
          id: string
          platform_fee: number
          recording_consent_earner: boolean | null
          recording_consent_seeker: boolean | null
          recording_id: string | null
          recording_started_at: string | null
          recording_url: string | null
          scheduled_duration: number
          scheduled_start: string
          seeker_id: string
          seeker_meeting_token: string | null
          status: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          credits_charged?: number | null
          credits_reserved: number
          daily_room_url?: string | null
          earner_amount: number
          earner_id: string
          earner_meeting_token?: string | null
          id?: string
          platform_fee: number
          recording_consent_earner?: boolean | null
          recording_consent_seeker?: boolean | null
          recording_id?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          scheduled_duration: number
          scheduled_start: string
          seeker_id: string
          seeker_meeting_token?: string | null
          status?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          credits_charged?: number | null
          credits_reserved?: number
          daily_room_url?: string | null
          earner_amount?: number
          earner_id?: string
          earner_meeting_token?: string | null
          id?: string
          platform_fee?: number
          recording_consent_earner?: boolean | null
          recording_consent_seeker?: boolean | null
          recording_id?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          scheduled_duration?: number
          scheduled_start?: string
          seeker_id?: string
          seeker_meeting_token?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_dates_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_earnings: number
          credit_balance: number
          pending_earnings: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_earnings?: number
          credit_balance?: number
          pending_earnings?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_earnings?: number
          credit_balance?: number
          pending_earnings?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_browse"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          status: string
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_browse: {
        Row: {
          account_status: string | null
          average_rating: number | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          featured_until: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          gender_preference: Database["public"]["Enums"]["gender"][] | null
          height: string | null
          hobbies: string[] | null
          id: string | null
          interests: string[] | null
          is_featured: boolean | null
          location_city: string | null
          location_state: string | null
          name: string | null
          profile_photos: string[] | null
          total_ratings: number | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          verification_status: string | null
          video_15min_rate: number | null
          video_30min_rate: number | null
          video_60min_rate: number | null
          video_90min_rate: number | null
        }
        Insert: {
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          featured_until?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          height?: string | null
          hobbies?: string[] | null
          id?: string | null
          interests?: string[] | null
          is_featured?: boolean | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          profile_photos?: string[] | null
          total_ratings?: number | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_status?: string | null
          video_15min_rate?: number | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
          video_90min_rate?: number | null
        }
        Update: {
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          featured_until?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          height?: string | null
          hobbies?: string[] | null
          id?: string | null
          interests?: string[] | null
          is_featured?: boolean | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          profile_photos?: string[] | null
          total_ratings?: number | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_status?: string | null
          video_15min_rate?: number | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
          video_90min_rate?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      charge_video_date_transaction: {
        Args: {
          p_credits_charged: number
          p_earner_amount: number
          p_earner_id: string
          p_platform_fee: number
          p_seeker_id: string
          p_usd_amount: number
          p_video_date_id: string
        }
        Returns: Json
      }
      check_account_switch: { Args: never; Returns: Json }
      get_browse_profiles: {
        Args: { p_target_user_type: string; p_viewer_user_type: string }
        Returns: {
          account_status: string
          average_rating: number
          bio: string
          created_at: string
          date_of_birth: string
          featured_until: string
          gender: Database["public"]["Enums"]["gender"]
          gender_preference: Database["public"]["Enums"]["gender"][]
          height: string
          hobbies: string[]
          id: string
          interests: string[]
          is_featured: boolean
          location_city: string
          location_state: string
          name: string
          profile_photos: string[]
          total_ratings: number
          user_type: Database["public"]["Enums"]["user_type"]
          verification_status: string
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_browse_profiles_all: {
        Args: never
        Returns: {
          account_status: string
          average_rating: number
          bio: string
          created_at: string
          date_of_birth: string
          featured_until: string
          gender: Database["public"]["Enums"]["gender"]
          gender_preference: Database["public"]["Enums"]["gender"][]
          height: string
          hobbies: string[]
          id: string
          interests: string[]
          is_featured: boolean
          location_city: string
          location_state: string
          name: string
          profile_photos: string[]
          total_ratings: number
          user_type: Database["public"]["Enums"]["user_type"]
          verification_status: string
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_browse_profiles_for_viewer: {
        Args: never
        Returns: {
          account_status: string
          activity_score: number
          average_rating: number
          bio: string
          created_at: string
          date_of_birth: string
          featured_until: string
          gender: Database["public"]["Enums"]["gender"]
          gender_preference: Database["public"]["Enums"]["gender"][]
          height: string
          hobbies: string[]
          id: string
          interests: string[]
          is_featured: boolean
          location_city: string
          location_state: string
          name: string
          profile_photos: string[]
          total_ratings: number
          user_type: Database["public"]["Enums"]["user_type"]
          verification_status: string
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_conversation_participant_profile: {
        Args: { p_profile_id: string }
        Returns: {
          id: string
          name: string
          profile_photos: string[]
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_featured_earners: {
        Args: never
        Returns: {
          id: string
          name: string
          profile_photo: string
        }[]
      }
      get_featured_earners_preview: {
        Args: never
        Returns: {
          first_name: string
          has_photo: boolean
          id: string
          profile_photo: string
        }[]
      }
      get_launch_signup_counts: {
        Args: never
        Returns: {
          earner_count: number
          seeker_count: number
        }[]
      }
      get_public_browse_profiles: {
        Args: never
        Returns: {
          age: number
          average_rating: number
          bio: string
          created_at: string
          featured_until: string
          gender: Database["public"]["Enums"]["gender"]
          height: string
          hobbies: string[]
          id: string
          interests: string[]
          is_featured: boolean
          location_city: string
          location_state: string
          name: string
          profile_photos: string[]
          total_ratings: number
          user_type: Database["public"]["Enums"]["user_type"]
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_public_browse_profiles_preview: {
        Args: never
        Returns: {
          first_name: string
          has_photo: boolean
          id: string
          is_featured: boolean
          location_city: string
          profile_photo: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_public_profile_by_id: {
        Args: { profile_id: string }
        Returns: {
          age: number
          average_rating: number
          bio: string
          created_at: string
          gender: Database["public"]["Enums"]["gender"]
          height: string
          hobbies: string[]
          id: string
          interests: string[]
          location_city: string
          location_state: string
          name: string
          profile_photos: string[]
          total_ratings: number
          user_type: Database["public"]["Enums"]["user_type"]
          video_15min_rate: number
          video_30min_rate: number
          video_60min_rate: number
          video_90min_rate: number
        }[]
      }
      get_top_gifters_alltime: {
        Args: { p_creator_id: string; p_limit?: number }
        Returns: {
          gifter_id: string
          gifter_name: string
          gifter_photo: string
          last_gift_at: string
          rank: number
          total_credits: number
        }[]
      }
      get_top_gifters_daily: {
        Args: { p_creator_id: string; p_limit?: number }
        Returns: {
          gifter_id: string
          gifter_name: string
          gifter_photo: string
          last_gift_at: string
          rank: number
          total_credits: number
        }[]
      }
      get_top_gifters_weekly: {
        Args: { p_creator_id: string; p_limit?: number }
        Returns: {
          gifter_id: string
          gifter_name: string
          gifter_photo: string
          last_gift_at: string
          rank: number
          total_credits: number
        }[]
      }
      get_user_rank_info: {
        Args: { p_creator_id: string; p_user_id: string }
        Returns: {
          credits_to_next_rank: number
          current_credits: number
          current_rank: number
          next_rank_credits: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_profile: { Args: { _profile_id: string }; Returns: boolean }
      mark_reservation_charged: {
        Args: { p_video_date_id: string }
        Returns: Json
      }
      release_credit_reservation: {
        Args: { p_reason?: string; p_video_date_id: string }
        Returns: Json
      }
      reserve_credits_for_video_date: {
        Args: {
          p_credits_amount: number
          p_user_id: string
          p_video_date_id: string
        }
        Returns: Json
      }
      send_gift: {
        Args: {
          p_conversation_id: string
          p_gift_id: string
          p_message?: string
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_message_type?: string
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      unlock_image: { Args: { p_message_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      gender: "male" | "female" | "non_binary" | "other"
      user_type: "seeker" | "earner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      gender: ["male", "female", "non_binary", "other"],
      user_type: ["seeker", "earner"],
    },
  },
} as const
