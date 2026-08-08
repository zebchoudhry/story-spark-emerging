import { createClient } from '@supabase/supabase-js';

// NOTE: In a production app, these should be in process.env
// For this architecture demo, you would populate these with your Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);