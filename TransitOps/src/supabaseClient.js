import { createClient } from '@supabase/supabase-js';

// Read endpoints from local configuration or environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'; // Defaults to local Supabase CLI dev environment
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
