import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(rawUrl && rawKey)

// Se ausente, utilizamos fallbacks do mesmo formato padrão do Supabase para impedir quebra do construtor
const supabaseUrl = rawUrl || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = rawKey || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

