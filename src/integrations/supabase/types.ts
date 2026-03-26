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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cancellations: {
        Row: {
          cancelled_by: string
          cancelled_by_role: string
          created_at: string
          delivery_id: string
          driver_arrived_at: string | null
          driver_wait_minutes: number | null
          id: string
          penalty_amount: number | null
          penalty_to: string | null
          reason: string | null
        }
        Insert: {
          cancelled_by: string
          cancelled_by_role: string
          created_at?: string
          delivery_id: string
          driver_arrived_at?: string | null
          driver_wait_minutes?: number | null
          id?: string
          penalty_amount?: number | null
          penalty_to?: string | null
          reason?: string | null
        }
        Update: {
          cancelled_by?: string
          cancelled_by_role?: string
          created_at?: string
          delivery_id?: string
          driver_arrived_at?: string | null
          driver_wait_minutes?: number | null
          id?: string
          penalty_amount?: number | null
          penalty_to?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          is_quick_message: boolean
          message: string
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          is_quick_message?: boolean
          message: string
          sender_user_id: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          is_quick_message?: boolean
          message?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          delivery_id: string | null
          id: string
          last_message_at: string | null
          last_message_text: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cash_amount: number | null
          commission_amount: number | null
          created_at: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_photo_url: string | null
          dispatch_mode: string
          driver_user_id: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          notes: string | null
          otp_code: string | null
          package_size: Database["public"]["Enums"]["package_size"] | null
          payout_amount: number | null
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_photo_url: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          store_confirmed_at: string | null
          store_confirmed_handover: boolean
          store_user_id: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cash_amount?: number | null
          commission_amount?: number | null
          created_at?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          dispatch_mode?: string
          driver_user_id?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          otp_code?: string | null
          package_size?: Database["public"]["Enums"]["package_size"] | null
          payout_amount?: number | null
          picked_up_at?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          store_confirmed_at?: string | null
          store_confirmed_handover?: boolean
          store_user_id: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cash_amount?: number | null
          commission_amount?: number | null
          created_at?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          dispatch_mode?: string
          driver_user_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          otp_code?: string | null
          package_size?: Database["public"]["Enums"]["package_size"] | null
          payout_amount?: number | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          store_confirmed_at?: string | null
          store_confirmed_handover?: boolean
          store_user_id?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_balance_transactions: {
        Row: {
          amount: number
          created_at: string
          delivery_id: string | null
          description: string | null
          driver_user_id: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          driver_user_id: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          driver_user_id?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_balance_transactions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          delivery_id: string | null
          driver_user_id: string
          id: string
          lat: number
          lng: number
          recorded_at: string
        }
        Insert: {
          delivery_id?: string | null
          driver_user_id: string
          id?: string
          lat: number
          lng: number
          recorded_at?: string
        }
        Update: {
          delivery_id?: string | null
          driver_user_id?: string
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payout_methods: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          bank_receiver_name: string | null
          created_at: string
          driver_user_id: string
          ewallet_number: string | null
          id: string
          instapay_number: string | null
          method: string
          updated_at: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          bank_receiver_name?: string | null
          created_at?: string
          driver_user_id: string
          ewallet_number?: string | null
          id?: string
          instapay_number?: string | null
          method: string
          updated_at?: string
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          bank_receiver_name?: string | null
          created_at?: string
          driver_user_id?: string
          ewallet_number?: string | null
          id?: string
          instapay_number?: string | null
          method?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          acceptance_rate: number | null
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          balance: number
          cancellation_count: number | null
          commission_per_delivery: number
          created_at: string
          criminal_record_url: string | null
          current_lat: number | null
          current_lng: number | null
          date_of_birth: string | null
          driver_status: string
          driving_license_back_url: string | null
          driving_license_expiry: string | null
          driving_license_front_url: string | null
          full_name: string
          governorate: string | null
          id: string
          is_online: boolean
          last_active_at: string | null
          license_url: string | null
          national_id_back_url: string | null
          national_id_expiry: string | null
          national_id_number: string | null
          national_id_url: string | null
          onboarding_completed: boolean | null
          phone: string | null
          plate_number: string | null
          rating: number | null
          second_phone: string | null
          selfie_url: string | null
          total_deliveries: number | null
          trial_deliveries_completed: number
          updated_at: string
          user_id: string
          vehicle_license_back_url: string | null
          vehicle_license_expiry: string | null
          vehicle_license_front_url: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          acceptance_rate?: number | null
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          balance?: number
          cancellation_count?: number | null
          commission_per_delivery?: number
          created_at?: string
          criminal_record_url?: string | null
          current_lat?: number | null
          current_lng?: number | null
          date_of_birth?: string | null
          driver_status?: string
          driving_license_back_url?: string | null
          driving_license_expiry?: string | null
          driving_license_front_url?: string | null
          full_name?: string
          governorate?: string | null
          id?: string
          is_online?: boolean
          last_active_at?: string | null
          license_url?: string | null
          national_id_back_url?: string | null
          national_id_expiry?: string | null
          national_id_number?: string | null
          national_id_url?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plate_number?: string | null
          rating?: number | null
          second_phone?: string | null
          selfie_url?: string | null
          total_deliveries?: number | null
          trial_deliveries_completed?: number
          updated_at?: string
          user_id: string
          vehicle_license_back_url?: string | null
          vehicle_license_expiry?: string | null
          vehicle_license_front_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          acceptance_rate?: number | null
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          balance?: number
          cancellation_count?: number | null
          commission_per_delivery?: number
          created_at?: string
          criminal_record_url?: string | null
          current_lat?: number | null
          current_lng?: number | null
          date_of_birth?: string | null
          driver_status?: string
          driving_license_back_url?: string | null
          driving_license_expiry?: string | null
          driving_license_front_url?: string | null
          full_name?: string
          governorate?: string | null
          id?: string
          is_online?: boolean
          last_active_at?: string | null
          license_url?: string | null
          national_id_back_url?: string | null
          national_id_expiry?: string | null
          national_id_number?: string | null
          national_id_url?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plate_number?: string | null
          rating?: number | null
          second_phone?: string | null
          selfie_url?: string | null
          total_deliveries?: number | null
          trial_deliveries_completed?: number
          updated_at?: string
          user_id?: string
          vehicle_license_back_url?: string | null
          vehicle_license_expiry?: string | null
          vehicle_license_front_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          delivery_id: string | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          delivery_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delivery_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delivery_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_id: string
          driver_user_id: string
          id: string
          rating: number
          store_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_id: string
          driver_user_id: string
          id?: string
          rating: number
          store_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_id?: string
          driver_user_id?: string
          id?: string
          rating?: number
          store_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          delivery_id: string | null
          details: string | null
          id: string
          reason: string
          reporter_role: string
          reporter_user_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          delivery_id?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_role: string
          reporter_user_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          delivery_id?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_role?: string
          reporter_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      store_profiles: {
        Row: {
          address: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          phone: string | null
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          store_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          store_name?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "store" | "driver" | "admin"
      approval_status: "pending" | "approved" | "rejected" | "suspended"
      delivery_status:
        | "pending"
        | "finding_driver"
        | "driver_accepted"
        | "arriving_pickup"
        | "picked_up"
        | "en_route"
        | "delivered"
        | "cancelled"
      package_size: "small" | "medium" | "large"
      vehicle_type: "motorcycle" | "car"
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
      app_role: ["store", "driver", "admin"],
      approval_status: ["pending", "approved", "rejected", "suspended"],
      delivery_status: [
        "pending",
        "finding_driver",
        "driver_accepted",
        "arriving_pickup",
        "picked_up",
        "en_route",
        "delivered",
        "cancelled",
      ],
      package_size: ["small", "medium", "large"],
      vehicle_type: ["motorcycle", "car"],
    },
  },
} as const
