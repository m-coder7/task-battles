import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mzkjnmbyryzfcpozjccq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lYoxybMAD2JIYd9WvB73Jw_NijzRLzw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
