import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key && !/YOUR-PROJECT-REF|your-project/i.test(`${url} ${key}`))
export const supabase = supabaseConfigured ? createClient(url!, key!) : null

export function isTestSession() {
  return import.meta.env.MODE === 'test' || (import.meta.env.DEV && sessionStorage.getItem('studyforge-e2e-auth') === 'enabled')
}
