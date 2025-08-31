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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      address_book: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          company_name: string | null
          contact_name: string
          country_code: string
          created_at: string | null
          created_by: string | null
          id: string
          org_id: string
          phone_number: string | null
          postal_code: string | null
          state_code: string | null
          user_id: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company_name?: string | null
          contact_name: string
          country_code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id: string
          phone_number?: string | null
          postal_code?: string | null
          state_code?: string | null
          user_id?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string
          country_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id?: string
          phone_number?: string | null
          postal_code?: string | null
          state_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_book_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          service_fee_percentage: number
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          service_fee_percentage?: number
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          service_fee_percentage?: number
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          created_at: string | null
          id: string
          items: Json | null
          packages: Json | null
          recipient_address1: string | null
          recipient_address2: string | null
          recipient_city: string | null
          recipient_company: string | null
          recipient_contact: string | null
          recipient_country: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_postal_code: string | null
          recipient_state: string | null
          selected_rate: Json | null
          shipper_address1: string | null
          shipper_address2: string | null
          shipper_city: string | null
          shipper_company: string | null
          shipper_contact: string | null
          shipper_country: string | null
          shipper_phone: string | null
          shipper_postal_code: string | null
          shipper_state: string | null
          shipping_purpose: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json | null
          packages?: Json | null
          recipient_address1?: string | null
          recipient_address2?: string | null
          recipient_city?: string | null
          recipient_company?: string | null
          recipient_contact?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_postal_code?: string | null
          recipient_state?: string | null
          selected_rate?: Json | null
          shipper_address1?: string | null
          shipper_address2?: string | null
          shipper_city?: string | null
          shipper_company?: string | null
          shipper_contact?: string | null
          shipper_country?: string | null
          shipper_phone?: string | null
          shipper_postal_code?: string | null
          shipper_state?: string | null
          shipping_purpose?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json | null
          packages?: Json | null
          recipient_address1?: string | null
          recipient_address2?: string | null
          recipient_city?: string | null
          recipient_company?: string | null
          recipient_contact?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_postal_code?: string | null
          recipient_state?: string | null
          selected_rate?: Json | null
          shipper_address1?: string | null
          shipper_address2?: string | null
          shipper_city?: string | null
          shipper_company?: string | null
          shipper_contact?: string | null
          shipper_country?: string | null
          shipper_phone?: string | null
          shipper_postal_code?: string | null
          shipper_state?: string | null
          shipping_purpose?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency_pair: string
          fetched_at: string
          id: number
          rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_pair?: string
          fetched_at?: string
          id?: number
          rate: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_pair?: string
          fetched_at?: string
          id?: number
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          is_read: boolean | null
          message: string | null
          org_id: string | null
          read_at: string | null
          target_user_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_read?: boolean | null
          message?: string | null
          org_id?: string | null
          read_at?: string | null
          target_user_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_read?: boolean | null
          message?: string | null
          org_id?: string | null
          read_at?: string | null
          target_user_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      open_shipments: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          fedex_index: string | null
          fedex_job_id: string | null
          id: string
          label_urls: string[] | null
          master_tracking_number: string | null
          org_id: string
          packages_added: number
          payment_id: string | null
          recipient_info: Json
          service_type: string
          shipper_info: Json
          status: Database["public"]["Enums"]["open_shipment_status"]
          total_amount: number | null
          total_packages: number
          tracking_numbers: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          fedex_index?: string | null
          fedex_job_id?: string | null
          id?: string
          label_urls?: string[] | null
          master_tracking_number?: string | null
          org_id: string
          packages_added?: number
          payment_id?: string | null
          recipient_info: Json
          service_type: string
          shipper_info: Json
          status?: Database["public"]["Enums"]["open_shipment_status"]
          total_amount?: number | null
          total_packages?: number
          tracking_numbers?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          fedex_index?: string | null
          fedex_job_id?: string | null
          id?: string
          label_urls?: string[] | null
          master_tracking_number?: string | null
          org_id?: string
          packages_added?: number
          payment_id?: string | null
          recipient_info?: Json
          service_type?: string
          shipper_info?: Json
          status?: Database["public"]["Enums"]["open_shipment_status"]
          total_amount?: number | null
          total_packages?: number
          tracking_numbers?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_shipments_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_line1: string | null
          address_line2: string | null
          address_prefecture: string | null
          company_name: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          full_name_kana: string | null
          id: string
          phone_number: string | null
          postal_code: string | null
          role: string | null
          title: string | null
        }
        Insert: {
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_prefecture?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          full_name_kana?: string | null
          id: string
          phone_number?: string | null
          postal_code?: string | null
          role?: string | null
          title?: string | null
        }
        Update: {
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_prefecture?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          full_name_kana?: string | null
          id?: string
          phone_number?: string | null
          postal_code?: string | null
          role?: string | null
          title?: string | null
        }
        Relationships: []
      }
      quote_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          org_id: string
          request_payload: Json
          response_payload: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          org_id: string
          request_payload: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          org_id?: string
          request_payload?: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_jobs_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_numbers: {
        Row: {
          created_at: string | null
          date_key: string
          id: string
          org_id: string
          receipt_number: string
          sequence_number: number
          transaction_id: number
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          date_key: string
          id?: string
          org_id: string
          receipt_number: string
          sequence_number: number
          transaction_id: number
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          date_key?: string
          id?: string
          org_id?: string
          receipt_number?: string
          sequence_number?: number
          transaction_id?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_numbers_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          country_of_manufacture: string | null
          currency: string | null
          description: string | null
          hs_code: string | null
          id: number
          quantity: number | null
          shipment_id: number | null
          total_value: number | null
          unit_price: number | null
          weight: number | null
        }
        Insert: {
          country_of_manufacture?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: number
          quantity?: number | null
          shipment_id?: number | null
          total_value?: number | null
          unit_price?: number | null
          weight?: number | null
        }
        Update: {
          country_of_manufacture?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: number
          quantity?: number | null
          shipment_id?: number | null
          total_value?: number | null
          unit_price?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_packages: {
        Row: {
          declared_value: number | null
          dimensions: Json | null
          id: number
          package_type: string | null
          shipment_id: number | null
          weight: number | null
        }
        Insert: {
          declared_value?: number | null
          dimensions?: Json | null
          id?: number
          package_type?: string | null
          shipment_id?: number | null
          weight?: number | null
        }
        Update: {
          declared_value?: number | null
          dimensions?: Json | null
          id?: number
          package_type?: string | null
          shipment_id?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          contents: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customs_details: Json | null
          final_charge: number | null
          id: number
          items: Json | null
          label_url: string | null
          org_id: string
          packages: Json | null
          payment_details: Json | null
          payment_id: string | null
          payment_status: string | null
          recipient: Json | null
          recipient_address1: string | null
          recipient_address2: string | null
          recipient_city: string | null
          recipient_company: string | null
          recipient_contact: string | null
          recipient_country: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_postal_code: string | null
          recipient_state: string | null
          refund_reason: string | null
          selected_rate: Json | null
          shipper: Json | null
          shipper_address1: string | null
          shipper_address2: string | null
          shipper_city: string | null
          shipper_company: string | null
          shipper_contact: string | null
          shipper_country: string | null
          shipper_phone: string | null
          shipper_postal_code: string | null
          shipper_state: string | null
          shipping_purpose: string | null
          shipping_status: string | null
          square_location_id: string | null
          square_payment_id: string | null
          square_refund_id: string | null
          status: string | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contents?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customs_details?: Json | null
          final_charge?: number | null
          id?: number
          items?: Json | null
          label_url?: string | null
          org_id: string
          packages?: Json | null
          payment_details?: Json | null
          payment_id?: string | null
          payment_status?: string | null
          recipient?: Json | null
          recipient_address1?: string | null
          recipient_address2?: string | null
          recipient_city?: string | null
          recipient_company?: string | null
          recipient_contact?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_postal_code?: string | null
          recipient_state?: string | null
          refund_reason?: string | null
          selected_rate?: Json | null
          shipper?: Json | null
          shipper_address1?: string | null
          shipper_address2?: string | null
          shipper_city?: string | null
          shipper_company?: string | null
          shipper_contact?: string | null
          shipper_country?: string | null
          shipper_phone?: string | null
          shipper_postal_code?: string | null
          shipper_state?: string | null
          shipping_purpose?: string | null
          shipping_status?: string | null
          square_location_id?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contents?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customs_details?: Json | null
          final_charge?: number | null
          id?: number
          items?: Json | null
          label_url?: string | null
          org_id?: string
          packages?: Json | null
          payment_details?: Json | null
          payment_id?: string | null
          payment_status?: string | null
          recipient?: Json | null
          recipient_address1?: string | null
          recipient_address2?: string | null
          recipient_city?: string | null
          recipient_company?: string | null
          recipient_contact?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_postal_code?: string | null
          recipient_state?: string | null
          refund_reason?: string | null
          selected_rate?: Json | null
          shipper?: Json | null
          shipper_address1?: string | null
          shipper_address2?: string | null
          shipper_city?: string | null
          shipper_company?: string | null
          shipper_contact?: string | null
          shipper_country?: string | null
          shipper_phone?: string | null
          shipper_postal_code?: string | null
          shipper_state?: string | null
          shipping_purpose?: string | null
          shipping_status?: string | null
          square_location_id?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_user_id_fkey"
            columns: ["user_id"]
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
      find_hs_codes_by_keywords: {
        Args: { input_keywords: string[]; limit_count?: number }
        Returns: {
          code: string
          description_en: string
          description_jp: string
          id: string
          match_count: number
        }[]
      }
      search_hs_codes: {
        Args: {
          limit_count?: number
          search_lang?: string
          search_term?: string
        }
        Returns: {
          code: string
          description_en: string
          description_jp: string
          id: string
          keywords: Json
          relevance_score: number
        }[]
      }
      suggest_hs_codes_for_description: {
        Args: { limit_count?: number; product_description: string }
        Returns: {
          code: string
          confidence_score: number
          description_en: string
          description_jp: string
          id: string
        }[]
      }
    }
    Enums: {
      open_shipment_status:
        | "created"
        | "in_progress"
        | "processing"
        | "confirmed"
        | "cancelled"
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
      open_shipment_status: [
        "created",
        "in_progress",
        "processing",
        "confirmed",
        "cancelled",
      ],
    },
  },
} as const
