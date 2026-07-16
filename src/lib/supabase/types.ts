export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          listing_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          listing_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          admin_response: string | null
          against_user_id: string | null
          closed_at: string | null
          created_at: string | null
          description: string
          filed_by: string
          id: string
          listing_id: string | null
          order_id: string | null
          resolved_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_response?: string | null
          against_user_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          description: string
          filed_by: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          resolved_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_response?: string | null
          against_user_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string
          filed_by?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          resolved_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_against_user_id_fkey"
            columns: ["against_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_ratings: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          listing_id: string
          order_id: string
          rating: number
          review: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          listing_id: string
          order_id: string
          rating: number
          review?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          order_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_ratings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_ratings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          category: string
          created_at: string | null
          description: string
          farmer_id: string
          id: string
          location_county: string
          location_ward: string | null
          photos: string[] | null
          price_kes: number
          quantity_available: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          category: string
          created_at?: string | null
          description: string
          farmer_id: string
          id?: string
          location_county: string
          location_ward?: string | null
          photos?: string[] | null
          price_kes: number
          quantity_available?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          category?: string
          created_at?: string | null
          description?: string
          farmer_id?: string
          id?: string
          location_county?: string
          location_ward?: string | null
          photos?: string[] | null
          price_kes?: number
          quantity_available?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          reference_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          reference_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          reference_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          buyer_id: string
          buyer_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          delivered_at: string | null
          farmer_earnings_kes: number
          farmer_id: string
          farmer_notes: string | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_deadline_at: string | null
          payment_failed_count: number
          platform_fee_kes: number
          quantity: number
          received_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount_kes: number
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          buyer_id: string
          buyer_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          farmer_earnings_kes?: number
          farmer_id: string
          farmer_notes?: string | null
          id?: string
          listing_id: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_failed_count?: number
          platform_fee_kes?: number
          quantity: number
          received_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_kes: number
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          buyer_id?: string
          buyer_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          farmer_earnings_kes?: number
          farmer_id?: string
          farmer_notes?: string | null
          id?: string
          listing_id?: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_failed_count?: number
          platform_fee_kes?: number
          quantity?: number
          received_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_kes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kes: number
          callback_received_at: string | null
          checkout_request_id: string | null
          created_at: string | null
          daraja_response: Json | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          order_id: string
          payer_id: string
          phone_number: string
          platform_fee_kes: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string | null
        }
        Insert: {
          amount_kes: number
          callback_received_at?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          daraja_response?: Json | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id: string
          payer_id: string
          phone_number: string
          platform_fee_kes?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string | null
        }
        Update: {
          amount_kes?: number
          callback_received_at?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          daraja_response?: Json | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string
          payer_id?: string
          phone_number?: string
          platform_fee_kes?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          county: string
          created_at: string | null
          full_name: string
          id: string
          is_suspended: boolean | null
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string | null
          vetting_notes: string | null
          vetting_reviewed_at: string | null
          vetting_status: Database["public"]["Enums"]["vetting_status"] | null
          vetting_submitted_at: string | null
          vetting_document_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          county: string
          created_at?: string | null
          full_name: string
          id: string
          is_suspended?: boolean | null
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          vetting_notes?: string | null
          vetting_reviewed_at?: string | null
          vetting_status?: Database["public"]["Enums"]["vetting_status"] | null
          vetting_submitted_at?: string | null
          vetting_document_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          county?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_suspended?: boolean | null
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          vetting_notes?: string | null
          vetting_reviewed_at?: string | null
          vetting_status?: Database["public"]["Enums"]["vetting_status"] | null
          vetting_submitted_at?: string | null
          vetting_document_url?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          buyer_id: string
          created_at: string | null
          farmer_id: string
          id: string
          order_id: string | null
          rating: number
          review: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          farmer_id: string
          id?: string
          order_id?: string | null
          rating: number
          review?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          farmer_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vetting_forms: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          farm_location_county: string
          farm_location_ward: string | null
          farm_name: string
          farm_size_acres: number | null
          farmer_id: string
          id: string
          id_number: string | null
          phone_number: string
          products_grown: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["vetting_status"]
          submitted_at: string | null
          supporting_document_url: string | null
          updated_at: string | null
          years_farming: number | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          farm_location_county: string
          farm_location_ward?: string | null
          farm_name: string
          farm_size_acres?: number | null
          farmer_id: string
          id?: string
          id_number?: string | null
          phone_number: string
          products_grown: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["vetting_status"]
          submitted_at?: string | null
          supporting_document_url?: string | null
          updated_at?: string | null
          years_farming?: number | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          farm_location_county?: string
          farm_location_ward?: string | null
          farm_name?: string
          farm_size_acres?: number | null
          farmer_id?: string
          id?: string
          id_number?: string | null
          phone_number?: string
          products_grown?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["vetting_status"]
          submitted_at?: string | null
          supporting_document_url?: string | null
          updated_at?: string | null
          years_farming?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vetting_forms_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vetting_forms_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_farmer_stats: {
        Args: { p_farmer_id: string }
        Returns: {
          avg_rating: number
          total_orders: number
          total_ratings: number
          total_revenue: number
          completed_sales: number
          avg_listing_rating: number
          total_listing_ratings: number
        }[]
      }
      get_farmer_brief_stats: {
        Args: { p_farmer_id: string }
        Returns: {
          completed_sales: number
          avg_rating: number
          total_ratings: number
          member_since: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      complaint_status: "open" | "in_progress" | "resolved" | "closed"
      listing_status: "active" | "inactive" | "archived"
      order_status: "pending" | "accepted" | "rejected" | "cancelled" | "paid" | "completed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      user_role: "farmer" | "buyer" | "admin"
      vetting_status: "pending" | "approved" | "rejected"
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
      complaint_status: ["open", "in_progress", "resolved", "closed"],
      listing_status: ["active", "inactive", "archived"],
      order_status: ["pending", "accepted", "rejected", "cancelled", "paid", "completed"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      user_role: ["farmer", "buyer", "admin"],
      vetting_status: ["pending", "approved", "rejected"],
    },
  },
} as const
