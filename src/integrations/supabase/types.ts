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
          seeker_id: string
          total_credits_spent: number
          total_messages: number
        }
        Insert: {
          created_at?: string
          earner_id: string
          id?: string
          last_message_at?: string | null
          seeker_id: string
          total_credits_spent?: number
          total_messages?: number
        }
        Update: {
          created_at?: string
          earner_id?: string
          id?: string
          last_message_at?: string | null
          seeker_id?: string
          total_credits_spent?: number
          total_messages?: number
        }
        Relationships: []
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
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          credits_cost: number
          earner_amount: number
          id: string
          message_type: string
          platform_fee: number
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          credits_cost: number
          earner_amount: number
          id?: string
          message_type?: string
          platform_fee: number
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          credits_cost?: number
          earner_amount?: number
          id?: string
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
          average_rating: number | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          created_at: string | null
          credit_balance: number | null
          date_of_birth: string | null
          earnings_balance: number | null
          email: string
          exit_reason: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          gender_preference: Database["public"]["Enums"]["gender"][] | null
          id: string
          last_reactivated_at: string | null
          location_city: string | null
          location_state: string | null
          name: string | null
          onboarding_step: number | null
          paused_date: string | null
          pending_balance: number | null
          profile_photos: string[] | null
          reactivation_count: number | null
          reactivation_eligible_date: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          suspend_until: string | null
          total_ratings: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          video_15min_rate: number | null
          video_30min_rate: number | null
          video_60min_rate: number | null
          video_90min_rate: number | null
        }
        Insert: {
          account_status?: string | null
          alumni_access_expires?: string | null
          average_rating?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email: string
          exit_reason?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          id: string
          last_reactivated_at?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          onboarding_step?: number | null
          paused_date?: string | null
          pending_balance?: number | null
          profile_photos?: string[] | null
          reactivation_count?: number | null
          reactivation_eligible_date?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          suspend_until?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          video_15min_rate?: number | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
          video_90min_rate?: number | null
        }
        Update: {
          account_status?: string | null
          alumni_access_expires?: string | null
          average_rating?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email?: string
          exit_reason?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          id?: string
          last_reactivated_at?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          onboarding_step?: number | null
          paused_date?: string | null
          pending_balance?: number | null
          profile_photos?: string[] | null
          reactivation_count?: number | null
          reactivation_eligible_date?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          suspend_until?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
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
          id: string
          platform_fee: number
          scheduled_duration: number
          scheduled_start: string
          seeker_id: string
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
          id?: string
          platform_fee: number
          scheduled_duration: number
          scheduled_start: string
          seeker_id: string
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
          id?: string
          platform_fee?: number
          scheduled_duration?: number
          scheduled_start?: string
          seeker_id?: string
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
      [_ in never]: never
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
