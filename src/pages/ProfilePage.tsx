import { useEffect, useState } from 'react'
import { CheckCircle2, Database, Globe2, RotateCcw, UserRound } from 'lucide-react'
import { dataSource, isDemoMode } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { LANGUAGES, useLanguage } from '../i18n/LanguageProvider'
import type { Language } from '../types/database'
import { Button, Card, Notice, Page, PageHeader } from '../components/ui/primitives'
import { FormRow, Select, TextInput } from '../components/ui/form'
import { integrationStatus, supabaseConfigured } from '../lib/env'

export default function ProfilePage() {
  const { t, language, setLanguage } = useLanguage()
  const { profile, userId, isAdmin, signOut, resetDemoData, readings } = useAppData()
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    location: '',
    preferred_language: language,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '',
      phone_number: profile.phone_number ?? '',
      location: profile.location ?? '',
      preferred_language: profile.preferred_language,
    })
  }, [profile])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await dataSource.upsertProfile({
        id: userId,
        full_name: form.full_name.trim() || 'Farmer',
        phone_number: form.phone_number.trim() || null,
        location: form.location.trim() || null,
        preferred_language: form.preferred_language,
      })
      setLanguage(form.preferred_language)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 4000)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page className="max-w-4xl">
      <PageHeader
        icon={<UserRound className="h-5 w-5" />}
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      {error && (
        <div className="mb-4">
          <Notice tone="red" title={t('common.error')}>
            {error}
          </Notice>
        </div>
      )}
      {saved && (
        <div className="mb-4">
          <Notice tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
            {t('profile.saved')}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <form onSubmit={save} className="space-y-4">
            <FormRow columns={1}>
              <TextInput
                label={t('profile.fullName')}
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                placeholder="Your name"
              />
            </FormRow>
            <FormRow>
              <TextInput
                label={`${t('profile.phone')} (${t('common.optional')})`}
                type="tel"
                value={form.phone_number}
                onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
              />
              <TextInput
                label={`${t('profile.location')} (${t('common.optional')})`}
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </FormRow>
            <FormRow columns={1}>
              <Select
                label={t('profile.language')}
                value={form.preferred_language}
                onChange={(event) => setForm({ ...form, preferred_language: event.target.value as Language })}
                hint="The assistant answers in this language, and the interface follows it."
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label} ({option.english})
                  </option>
                ))}
              </Select>
            </FormRow>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={saving}>
                {t('common.save')}
              </Button>
              <span className="text-xs text-forest-600">
                {t('profile.role')}: {isAdmin ? t('profile.roleAdmin') : t('profile.roleFarmer')}
              </span>
            </div>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
              <Database className="h-4 w-4" aria-hidden /> {t('profile.account')}
            </h2>
            <p className="mt-2 text-sm font-semibold text-forest-900">
              {supabaseConfigured ? t('profile.modeSupabase') : t('profile.modeDemo')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-forest-700">
              {supabaseConfigured
                ? 'Records are stored in your Supabase Postgres database and protected by row-level security.'
                : t('profile.demoBody')}
            </p>
            <div className="mt-3 space-y-1 text-xs text-forest-700">
              <p>AI engine: {integrationStatus.ai}</p>
              <p>Crop image model: {integrationStatus.cropClinic}</p>
              <p>Soil sensor: {readings.length > 0 ? 'readings arriving' : 'no readings received'}</p>
              <p>Voice input: {integrationStatus.voice}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void signOut()}>
                {t('common.signOut')}
              </Button>
              {isDemoMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm('Clear all demo records stored in this browser?')) void resetDemoData()
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
              <Globe2 className="h-4 w-4" aria-hidden /> {t('common.language')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-forest-700">
              English, Kannada and Hindi are available today. Agricultural knowledge entries carry their own language,
              so translations can be added entry by entry without changing the app.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setLanguage(option.code)
                    setForm({ ...form, preferred_language: option.code })
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    language === option.code
                      ? 'border-forest-600 bg-forest-700 text-white'
                      : 'border-forest-200 bg-white text-forest-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
