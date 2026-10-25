import { createClient } from '@supabase/supabase-js'

// Remplace "https://exemple.supabase.co" par ta vraie Project URL Supabase dès que tu l'as
const supabaseUrl = "https://owagujuqgdijnnlttdmq.supabase.co"
const supabaseAnonKey = 'sb_publishable_q6phIAbMuE5I91nb5rXUmw_3HQZGsPf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)