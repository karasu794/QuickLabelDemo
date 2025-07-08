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
      profiles: {
        Row: {
          id: string
          email: string | null
          contact_name: string | null
          contact_name_kana: string | null
          company_name: string | null
          department: string | null
          title: string | null
          phone_number: string | null
          postal_code: string | null
          address_prefecture: string | null
          address_city: string | null
          address_line1: string | null
          address_line2: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          contact_name?: string | null
          contact_name_kana?: string | null
          company_name?: string | null
          department?: string | null
          title?: string | null
          phone_number?: string | null
          postal_code?: string | null
          address_prefecture?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          contact_name?: string | null
          contact_name_kana?: string | null
          company_name?: string | null
          department?: string | null
          title?: string | null
          phone_number?: string | null
          postal_code?: string | null
          address_prefecture?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_jobs: {
        Row: {
          id: string
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

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type QuoteJob = Database['public']['Tables']['quote_jobs']['Row']
export type QuoteJobInsert = Database['public']['Tables']['quote_jobs']['Insert']
export type QuoteJobUpdate = Database['public']['Tables']['quote_jobs']['Update'] 