import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isTestSession, supabase } from '../services/supabase'

type AuthState = { session: Session | null; user: User | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isTestSession()) {
      const testUser = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@studyforge.local', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() } as User
      const testSession = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: testUser } as Session
      setSession(testSession)
      setLoading(false)
      return
    }
    if (!supabase) { setLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false) } })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setLoading(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthState>(() => ({
    session, user: session?.user ?? null, loading,
    signOut: async () => { if (supabase) await supabase.auth.signOut(); setSession(null) },
  }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
