import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface DbUser {
  id: string;
  toss_user_key: number;
  ai_credits: number;
  created_at: string;
}

export interface DbFamily {
  id: string;
  owner_id: string;
  invite_code: string;
  first_name: string;
  second_name: string;
  created_at: string;
}

export interface DbLog {
  id: string;
  family_id: string;
  date: string;
  time: string;
  baby: '1' | '2' | 'both';
  volume: number | null;
  unit: 'ml' | 'min' | 'nap' | null;
  poop: boolean;
  created_at: string;
}
