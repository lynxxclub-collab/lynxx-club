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
      profiles: {
        Row: {
          account_status: string | null
          average_rating: number | null
          bio: string | null
          created_at: string | null
          credit_balance: number | null
          date_of_birth: string | null
          earnings_balance: number | null
          email: string
          gender: Database["public"]["Enums"]["gender"] | null
          gender_preference: Database["public"]["Enums"]["gender"][] | null
          id: string
          location_city: string | null
          location_state: string | null
          name: string | null
          onboarding_step: number | null
          pending_balance: number | null
          profile_photos: string[] | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          total_ratings: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          video_30min_rate: number | null
          video_60min_rate: number | null
        }
        Insert: {
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email: string
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          id: string
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          onboarding_step?: number | null
          pending_balance?: number | null
          profile_photos?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
        }
        Update: {
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          credit_balance?: number | null
          date_of_birth?: string | null
          earnings_balance?: number | null
          email?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][] | null
          id?: string
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          onboarding_step?: number | null
          pending_balance?: number | null
          profile_photos?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_ratings?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          video_30min_rate?: number | null
          video_60min_rate?: number | null
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
        ]
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
