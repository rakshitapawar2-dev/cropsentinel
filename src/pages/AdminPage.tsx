import { useEffect, useState } from 'react'
import { BookOpen, Plus, ServerCog, ShieldCheck, Trash2 } from 'lucide-react'
import type { AgriculturalKnowledge, Language, VerificationStatus } from '../types/database'
import { dataSource, isDemoMode } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { FormRow, Select, TextArea, TextInput } from '../components/ui/form'
import { integrationStatus } from '../lib/env'
import { formatDate } from '../lib/utils'
import { SAMPLE_SOURCE } from '../data/sampleKnowledge'

type Tab = 'knowledge' | 'integrations'

const VERIFICATION_TONE: Record<VerificationStatus, 'green' | 'amber' | 'neutral'> = {
  verified: 'green',
  unverified: 'amber',
  sample: 'neutral',
}

export default function AdminPage() {
  const { t, language } = useLanguage()
  const { isAdmin, userId, readings } = useAppData()
  const [tab, setTab] = useState<Tab>('knowledge')
  const [entries, setEntries] = useState<AgriculturalKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    topic: '',
    crop_type: '',
    language: 'en' as Language,
    content: '',
    source_name: SAMPLE_SOURCE,
    source_url: '',
    verification_status: 'unverified' as VerificationStatus,
  })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const knowledge = await dataSource.listKnowledge()
        if (!active) return
        setEntries(knowledge)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load admin data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    if (isAdmin) void load()
    else setLoading(false)
    return () => {
      active = false
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <Page>
        <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title={t('admin.accessDenied')} body="Ask an administrator to grant the admin role to your profile." />
      </Page>
    )
  }

  async function createEntry(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const created = await dataSource.createKnowledge({
        title: form.title.trim(),
        topic: form.topic.trim() || 'General',
        crop_type: form.crop_type.trim() || null,
        language: form.language,
        content: form.content.trim(),
        source_name: form.source_name.trim() || SAMPLE_SOURCE,
        source_url: form.source_url.trim() || null,
        verification_status: form.verification_status,
        last_reviewed: form.verification_status === 'verified' ? new Date().toISOString().slice(0, 10) : null,
      })
      setEntries((previous) => [created, ...previous])
      setOpen(false)
      setForm({
        title: '',
        topic: '',
        crop_type: '',
        language: 'en',
        content: '',
        source_name: SAMPLE_SOURCE,
        source_url: '',
        verification_status: 'unverified',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the entry.')
    } finally {
      setSaving(false)
    }
  }

  async function changeVerification(entry: AgriculturalKnowledge, status: VerificationStatus) {
    try {
      await dataSource.updateKnowledge(entry.id, {
        verification_status: status,
        last_reviewed: status === 'verified' ? new Date().toISOString().slice(0, 10) : entry.last_reviewed,
      })
      setEntries((previous) =>
        previous.map((item) => (item.id === entry.id ? { ...item, verification_status: status } : item)),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the entry.')
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm('Delete this knowledge entry?')) return
    try {
      await dataSource.deleteKnowledge(id)
      setEntries((previous) => previous.filter((item) => item.id !== id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the entry.')
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
    { id: 'knowledge', label: t('admin.knowledge'), icon: BookOpen },
    { id: 'integrations', label: t('admin.integrations'), icon: ServerCog },
  ]

  return (
    <Page>
      <PageHeader
        icon={<ShieldCheck className="h-5 w-5" />}
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={
          tab === 'knowledge' ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> {t('admin.addKnowledge')}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-forest-200 bg-white p-1" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === item.id ? 'bg-forest-700 text-white' : 'text-forest-700 hover:bg-forest-50'
            }`}
          >
            <item.icon className="h-4 w-4" aria-hidden /> {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Notice tone="red" title={t('common.error')}>
            {error}
          </Notice>
        </div>
      )}

      {tab === 'knowledge' && (
        <>
          <Notice tone="amber">
            The bundled entries are sample content, not verified agricultural research. Mark an entry “Verified” only
            after it has been reviewed against a trusted source. The assistant labels sample content as sample.
          </Notice>
          {loading ? (
            <p className="mt-4 text-sm text-forest-600">{t('common.loading')}</p>
          ) : entries.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No knowledge entries yet." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {entries.map((entry) => (
                <Card as="li" key={entry.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-forest-900">{entry.title}</h2>
                      <p className="mt-0.5 text-xs text-forest-600">
                        {entry.topic} · {entry.crop_type ?? 'All crops'} · {entry.language.toUpperCase()}
                        {entry.last_reviewed ? ` · ${t('admin.reviewed')} ${formatDate(entry.last_reviewed, language)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={VERIFICATION_TONE[entry.verification_status]}>
                        {entry.verification_status === 'verified'
                          ? t('admin.verified')
                          : entry.verification_status === 'sample'
                            ? t('admin.sample')
                            : t('admin.unverified')}
                      </Badge>
                      <select
                        value={entry.verification_status}
                        onChange={(event) =>
                          void changeVerification(entry, event.target.value as VerificationStatus)
                        }
                        aria-label={`Verification status for ${entry.title}`}
                        className="rounded-lg border border-forest-200 bg-white px-2 py-1 text-xs font-medium text-forest-900"
                      >
                        <option value="sample">sample</option>
                        <option value="unverified">unverified</option>
                        <option value="verified">verified</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void removeEntry(entry.id)}
                        className="rounded-lg p-1.5 text-forest-400 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${entry.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{entry.content}</p>
                  <p className="mt-2 text-xs text-forest-600">
                    {t('admin.source')}: {entry.source_name}
                    {entry.source_url && (
                      <>
                        {' · '}
                        <a href={entry.source_url} target="_blank" rel="noreferrer" className="underline">
                          {entry.source_url}
                        </a>
                      </>
                    )}
                  </p>
                </Card>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'integrations' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: 'Database',
              value: isDemoMode ? 'Local demo (browser only)' : 'Supabase Postgres + RLS',
              detail: isDemoMode
                ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to sync records.'
                : 'Row level security keeps each farmer’s records private.',
            },
            {
              title: 'AI assistant',
              value: integrationStatus.ai,
              detail: isDemoMode
                ? 'The local knowledge engine answers. Deploy the ai-assistant function for model answers.'
                : 'Answers come from the ai-assistant Edge Function, which holds the provider key.',
            },
            {
              title: 'Crop image model',
              value: integrationStatus.cropClinic,
              detail: 'Point VITE_CROP_CLINIC_URL at a FastAPI service exposing POST /analyze.',
            },
            {
              title: 'Soil moisture sensor',
              value: readings.length > 0 ? 'Readings are arriving' : 'No readings received',
              detail: 'Arduino readings must be written through the sensor-ingest function. Pump control stays disabled.',
            },
          ].map((item) => (
            <Card key={item.title}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">{item.title}</h2>
              <p className="mt-1 text-base font-semibold text-forest-900">{item.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-forest-700">{item.detail}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('admin.addKnowledge')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button form="knowledge-form" type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="knowledge-form" onSubmit={createEntry} className="space-y-4">
          <FormRow>
            <TextInput
              label={t('admin.titleField')}
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <TextInput
              label={t('admin.topic')}
              required
              value={form.topic}
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
              placeholder="e.g. Irrigation"
            />
          </FormRow>
          <FormRow>
            <TextInput
              label={`${t('plants.crop')} (${t('common.optional')})`}
              value={form.crop_type}
              onChange={(event) => setForm({ ...form, crop_type: event.target.value })}
            />
            <Select
              label={t('common.language')}
              value={form.language}
              onChange={(event) => setForm({ ...form, language: event.target.value as Language })}
            >
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="hi">हिन्दी</option>
            </Select>
          </FormRow>
          <TextArea
            label={t('admin.content')}
            required
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            className="min-h-[140px]"
          />
          <FormRow>
            <TextInput
              label={t('admin.sourceName')}
              value={form.source_name}
              onChange={(event) => setForm({ ...form, source_name: event.target.value })}
            />
            <TextInput
              label={`${t('admin.sourceUrl')} (${t('common.optional')})`}
              value={form.source_url}
              onChange={(event) => setForm({ ...form, source_url: event.target.value })}
            />
          </FormRow>
          <FormRow columns={1}>
            <Select
              label={t('admin.verification')}
              value={form.verification_status}
              onChange={(event) =>
                setForm({ ...form, verification_status: event.target.value as VerificationStatus })
              }
            >
              <option value="sample">sample</option>
              <option value="unverified">unverified</option>
              <option value="verified">verified</option>
            </Select>
          </FormRow>
        </form>
      </Modal>
    </Page>
  )
}
