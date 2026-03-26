import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://eurjdhzdqlurvbgyeqgg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cmpkaHpkcWx1cnZiZ3llcWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTk1MzIsImV4cCI6MjA5MDEzNTUzMn0.dGq-sgGBAnE3lnyvMgxHyCRkra8vohqJlX3jVnzzbS4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});