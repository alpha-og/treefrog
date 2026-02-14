import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          is_admin: boolean
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          tier: string
          storage_used_bytes: number
          subscription_canceled_at: string | null
          subscription_paused: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          is_admin?: boolean
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          tier?: string
          storage_used_bytes?: number
          subscription_canceled_at?: string | null
          subscription_paused?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          is_admin?: boolean
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          tier?: string
          storage_used_bytes?: number
          subscription_canceled_at?: string | null
          subscription_paused?: boolean
          updated_at?: string
        }
      }
      builds: {
        Row: {
          id: string
          user_id: string
          status: string
          engine: string
          main_file: string | null
          dir_path: string | null
          pdf_path: string | null
          synctex_path: string | null
          build_log: string | null
          error_message: string | null
          shell_escape: boolean
          storage_bytes: number
          created_at: string
          updated_at: string
          expires_at: string | null
          last_accessed_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          engine?: string
          main_file?: string | null
          dir_path?: string | null
          pdf_path?: string | null
          synctex_path?: string | null
          build_log?: string | null
          error_message?: string | null
          shell_escape?: boolean
          storage_bytes?: number
          created_at?: string
          updated_at?: string
          expires_at?: string | null
          last_accessed_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          status?: string
          engine?: string
          main_file?: string | null
          pdf_path?: string | null
          synctex_path?: string | null
          build_log?: string | null
          error_message?: string | null
          storage_bytes?: number
          updated_at?: string
          expires_at?: string | null
          last_accessed_at?: string | null
          deleted_at?: string | null
        }
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
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Build = Database['public']['Tables']['builds']['Row']
