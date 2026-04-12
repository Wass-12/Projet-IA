import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

export const supabase = (url && key)
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

if (!supabase) {
  console.warn("⚠️  SUPABASE_URL / SUPABASE_SERVICE_KEY non définies — /api/garments désactivée")
}
