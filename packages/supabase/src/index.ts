import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  return '';
};

const getSupabaseKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) {
    return process.env.SUPABASE_PUBLISHABLE_KEY;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) {
    return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
  return '';
};

const supabaseUrl = getSupabaseUrl();
const supabasePublishableKey = getSupabaseKey();

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Missing Supabase environment variables. Using placeholder client.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key'
);

export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          is_admin: boolean;
          razorpay_customer_id: string | null;
          razorpay_subscription_id: string | null;
          tier: string;
          storage_used_bytes: number;
          subscription_canceled_at: string | null;
          subscription_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          is_admin?: boolean;
          razorpay_customer_id?: string | null;
          razorpay_subscription_id?: string | null;
          tier?: string;
          storage_used_bytes?: number;
          subscription_canceled_at?: string | null;
          subscription_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          is_admin?: boolean;
          razorpay_customer_id?: string | null;
          razorpay_subscription_id?: string | null;
          tier?: string;
          storage_used_bytes?: number;
          subscription_canceled_at?: string | null;
          subscription_paused?: boolean;
          updated_at?: string;
        };
      };
      builds: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          engine: string;
          main_file: string | null;
          dir_path: string | null;
          pdf_path: string | null;
          synctex_path: string | null;
          build_log: string | null;
          error_message: string | null;
          shell_escape: boolean;
          storage_bytes: number;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          last_accessed_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: string;
          engine?: string;
          main_file?: string | null;
          dir_path?: string | null;
          pdf_path?: string | null;
          synctex_path?: string | null;
          build_log?: string | null;
          error_message?: string | null;
          shell_escape?: boolean;
          storage_bytes?: number;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          last_accessed_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          status?: string;
          engine?: string;
          main_file?: string | null;
          pdf_path?: string | null;
          synctex_path?: string | null;
          build_log?: string | null;
          error_message?: string | null;
          storage_bytes?: number;
          updated_at?: string;
          expires_at?: string | null;
          last_accessed_at?: string | null;
          deleted_at?: string | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          razorpay_invoice_id: string;
          amount: number;
          currency: string;
          status: string;
          invoice_url: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          razorpay_invoice_id: string;
          amount: number;
          currency: string;
          status: string;
          invoice_url?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          invoice_url?: string | null;
          paid_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          status: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          status?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          details?: Json | null;
          status?: string | null;
          error_message?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Build = Database['public']['Tables']['builds']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
