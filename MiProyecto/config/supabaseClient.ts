import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yntbwfyfiaseohgamnzu.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn('Warning: SUPABASE_ANON_KEY is not set. Authentication will not work.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
