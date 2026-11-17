import { useState } from 'react'
import { Leaf, Loader2, Lock } from 'lucide-react'
import { Logo } from '../components/layout/Logo'
import { LanguageSelect } from '../components/layout/LanguageSelect'
import { Button } from '../components/ui/primitives'
import { TextInput } from '../components/ui/form'
import { useLanguage } from '../i18n/LanguageProvider'
import { supabase } from '../lib/supabaseClient'
import { supabaseConfigured } from '../lib/env'

/**
 * Sign-in screen for a connected Supabase project.
 * Sessions are real Supabase sessions, so Row Level Security decides what the
 * API will return — there is no client-side "demo user" bypass here.
 */
export default function AuthPage() {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (data.session) {
          setMessage('Account created. Loading your farm…')
        } else {
          setMessage(t('auth.checkEmail'))
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageSelect labelled={false} />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md rounded-2xl border border-forest-100 bg-white p-6 shadow-soft sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700">
              <Leaf className="h-3.5 w-3.5" aria-hidden /> CropSentinel
            </span>
            <h1 className="mt-4 text-2xl font-bold text-forest-900">
              {mode === 'signIn' ? t('auth.signInTitle') : t('auth.signUp')}
            </h1>
            <p className="mt-1 text-sm text-forest-700">{t('auth.signInBody')}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <TextInput
                label={t('auth.email')}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="farmer@example.com"
              />
              <TextInput
                label={t('auth.password')}
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint="At least 6 characters."
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg bg-leaf-50 px-3 py-2 text-sm text-forest-800" role="status">
                  {message}
                </p>
              )}
              <Button type="submit" fullWidth size="lg" loading={busy}>
                {busy ? t('common.loading') : mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-forest-700 underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn')
                setError(null)
                setMessage(null)
              }}
            >
              {mode === 'signIn' ? t('auth.signUp') : t('auth.signIn')}
            </button>

            <div className="mt-6 flex items-start gap-2 rounded-xl bg-cream/80 p-3 text-xs leading-relaxed text-forest-700">
              {busy ? (
                <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Lock className="mt-0.5 h-3.5 w-3.5" aria-hidden />
              )}
              <p>
                Your records are protected by database row-level security: only your own account can read or change
                them. {supabaseConfigured ? 'Connected to Supabase.' : 'Supabase is not configured yet.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
