import { useState, type FormEvent } from 'react'
import { Bookmark, Github, KeyRound, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { supabase, supabaseConfigured } from '../services/supabase'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (result.error) setError(result.error.message)
      else if (mode === 'signup' && !result.data.session) setMessage('Check your email to confirm your account, then sign in.')
    } catch { setError('Could not reach Supabase Auth. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  async function oauth(provider: 'google' | 'github') {
    if (!supabase) return
    setBusy(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
      if (authError) setError(authError.message)
    } catch { setError('Could not start provider sign-in. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  return <main className="auth-screen"><section className="auth-card" aria-labelledby="auth-title">
    <Link to="/" className="auth-brand" aria-label="StudyForge"><span className="brand-mark"><Bookmark size={21} /></span><span>Study<span className="brand-light">Forge</span><span className="brand-period">.</span></span></Link>
    <span className="auth-eyebrow">YOUR PERSONAL LEARNING SPACE</span>
    <h1 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Make room to grow.'}</h1>
    <p className="auth-intro">{mode === 'login' ? 'Sign in to continue where your curiosity left off.' : 'Create an account to keep your learning in sync.'}</p>
    {!supabaseConfigured ? <div className="request-error" role="alert">Supabase Auth isn’t configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.local, then restart Vite.</div> : <>
      <div className="auth-providers"><button type="button" className="auth-provider" onClick={() => oauth('google')} disabled={busy}><span className="google-mark">G</span>Continue with Google</button><button type="button" className="auth-provider" onClick={() => oauth('github')} disabled={busy}><Github size={17} />Continue with GitHub</button></div>
      <div className="auth-divider"><span>or with email</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
        {error && <p className="request-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
        <button className="button primary auth-submit" type="submit" disabled={busy}>{mode === 'login' ? <><KeyRound size={16} /> Sign in</> : <><Mail size={16} /> Create account</>}</button>
      </form>
      <p className="auth-switch">{mode === 'login' ? 'New to StudyForge?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
    </>}
    <p className="auth-privacy">Your learning paths and notes belong to your account.</p>
  </section><aside className="auth-aside"><span className="auth-aside-mark"><Bookmark size={30} /></span><p>Thoughtful learning.<br /><em>Lasting understanding.</em></p><span>Build knowledge one idea at a time.</span><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/></aside></main>
}
