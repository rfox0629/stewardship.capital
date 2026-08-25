import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: process.argv[2] });
if (error) throw error;
console.log(data.properties.hashed_token);
