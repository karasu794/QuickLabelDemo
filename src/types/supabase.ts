export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      address_book: {
        Row: {
          id: string
          user_id: string
          contact_name: string
          company_name: string | null
          phone_number: string | null
          address1: string | null
          address2: string | null
          city: string | null
          state_code: string | null
          postal_code: string | null
          country_code: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          contact_name: string
          company_name?: string | null
          phone_number?: string | null
          address1?: string | null
          address2?: string | null
          city?: string | null
          state_code?: string | null
          postal_code?: string | null
          country_code: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          contact_name?: string
          company_name?: string | null
          phone_number?: string | null
          address1?: string | null
          address2?: string | null
          city?: string | null
          state_code?: string | null
          postal_code?: string | null
          country_code?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          message: string
          is_read: boolean | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          read_at: string | null
        }
        Insert: {
          id?: string
          type: string
          message: string
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          read_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          message?: string
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          read_at?: string | null
        }
        Relationships: []
      }
      open_shipments: {
        Row: {
          id: string
          user_id: string | null
          master_tracking_number: string | null
          fedex_index: string | null
          fedex_job_id: string | null
          status: 'created' | 'in_progress' | 'processing' | 'confirmed' | 'cancelled'
          total_packages: number
          packages_added: number
          shipper_info: Json
          recipient_info: Json
          service_type: string
          payment_id: string | null
          total_amount: number | null
          tracking_numbers: string[] | null
          label_urls: string[] | null
          created_at: string | null
          updated_at: string | null
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          master_tracking_number?: string | null
          fedex_index?: string | null
          fedex_job_id?: string | null
          status?: 'created' | 'in_progress' | 'processing' | 'confirmed' | 'cancelled'
          total_packages?: number
          packages_added?: number
          shipper_info: Json
          recipient_info: Json
          service_type: string
          payment_id?: string | null
          total_amount?: number | null
          tracking_numbers?: string[] | null
          label_urls?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          master_tracking_number?: string | null
          fedex_index?: string | null
          fedex_job_id?: string | null
          status?: 'created' | 'in_progress' | 'processing' | 'confirmed' | 'cancelled'
          total_packages?: number
          packages_added?: number
          shipper_info?: Json
          recipient_info?: Json
          service_type?: string
          payment_id?: string | null
          total_amount?: number | null
          tracking_numbers?: string[] | null
          label_urls?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          confirmed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          role: string | null
          company_name: string | null
          phone_number: string | null
          address: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string | null
          company_name?: string | null
          phone_number?: string | null
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string | null
          company_name?: string | null
          phone_number?: string | null
          address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_jobs: {
        Row: {
          id: string
          user_id: string | null
          status: 'pending' | 'processing_auth' | 'processing_rate_request' | 'completed' | 'failed'
          request_payload: Json
          response_payload: Json | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          status?: 'pending' | 'processing_auth' | 'processing_rate_request' | 'completed' | 'failed'
          request_payload: Json
          response_payload?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          status?: 'pending' | 'processing_auth' | 'processing_rate_request' | 'completed' | 'failed'
          request_payload?: Json
          response_payload?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          id: string
          user_id: string
          tracking_number: string
          status: string
          shipper_country: string | null
          payment_id: string | null
          square_payment_id: string | null
          total_amount: number | null
          label_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tracking_number: string
          status?: string
          shipper_country?: string | null
          payment_id?: string | null
          square_payment_id?: string | null
          total_amount?: number | null
          label_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tracking_number?: string
          status?: string
          shipper_country?: string | null
          payment_id?: string | null
          square_payment_id?: string | null
          total_amount?: number | null
          label_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// TypeScript型エイリアス
export type AppSetting = Database['public']['Tables']['app_settings']['Row']
export type AppSettingInsert = Database['public']['Tables']['app_settings']['Insert']
export type AppSettingUpdate = Database['public']['Tables']['app_settings']['Update']

export type AddressBook = Database['public']['Tables']['address_book']['Row']
export type AddressBookInsert = Database['public']['Tables']['address_book']['Insert']
export type AddressBookUpdate = Database['public']['Tables']['address_book']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type OpenShipment = Database['public']['Tables']['open_shipments']['Row']
export type OpenShipmentInsert = Database['public']['Tables']['open_shipments']['Insert']
export type OpenShipmentUpdate = Database['public']['Tables']['open_shipments']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type QuoteJob = Database['public']['Tables']['quote_jobs']['Row']
export type QuoteJobInsert = Database['public']['Tables']['quote_jobs']['Insert']
export type QuoteJobUpdate = Database['public']['Tables']['quote_jobs']['Update']

export type Shipment = Database['public']['Tables']['shipments']['Row']
export type ShipmentInsert = Database['public']['Tables']['shipments']['Insert']
export type ShipmentUpdate = Database['public']['Tables']['shipments']['Update'] 