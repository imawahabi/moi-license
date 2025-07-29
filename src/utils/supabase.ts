import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          full_name: string;
          rank: string;
          file_number: string;
          category: 'ضابط' | 'ضابط صف' | 'مهني' | 'مدني';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          rank: string;
          file_number: string;
          category: 'ضابط' | 'ضابط صف' | 'مهني' | 'مدني';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          rank?: string;
          file_number?: string;
          category?: 'ضابط' | 'ضابط صف' | 'مهني' | 'مدني';
          updated_at?: string;
        };
      };
      licenses: {
        Row: {
          id: string;
          employee_id: string;
          license_type: 'يوم كامل' | 'ساعات محددة';
          license_date: string;
          hours: number | null;
          month: number;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          license_type: 'يوم كامل' | 'ساعات محددة';
          license_date: string;
          hours?: number | null;
          month: number;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          license_type?: 'يوم كامل' | 'ساعات محددة';
          license_date?: string;
          hours?: number | null;
          month?: number;
          year?: number;
          updated_at?: string;
        };
      };
    };
  };
};