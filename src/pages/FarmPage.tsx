import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Plus, Ruler, Sprout, Trash2, Warehouse } from 'lucide-react'
import { dataSource, isDemoMode, localSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Button, Card, EmptyState, Notice, Page, PageHeader } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { FormRow, TextInput } from '../components/ui/form'
import { formatDate } from '../lib/utils'

export default function FarmPage() {
  const { t, language } = useLanguage()
  const { farms, plants, userId, refresh } = useAppData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ farm_name: '', location: '', farm_size: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function createFarm(event: React.FormEvent) {
    event.preventDefault()
    if (!userId || !form.farm_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await dataSource.createFarm({
        owner_id: userId,
        farm_name: form.farm_name.trim(),
        location: form.location.trim() || null,
        farm_size: form.farm_size.trim() || null,
      })
      setForm({ farm_name: '', location: '', farm_size: '' })
      setOpen(false)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the farm.')
    } finally {
      setSaving(false)
    }
  }

  async function removeFarm(id: string) {
    if (!window.confirm('Delete this farm and its plants, observations and alerts? This cannot be undone.')) return
    try {
      await dataSource.deleteFarm(id)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the farm.')
    }
  }

  async function loadSample() {
    if (!userId) return
    setSaving(true)
    try {
      await localSource.loadSampleFarm(userId)
      setNotice(t('farm.sampleNotice'))
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add sample records.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        icon={<Warehouse className="h-5 w-5" />}
        title={t('farm.title')}
        subtitle={t('farm.subtitle')}
        actions={
          <Button onClick={() => setOpen(true)} disabled={!userId}>
            <Plus className="h-4 w-4" aria-hidden /> {t('farm.add')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="red" title={t('common.error')}>
            {error}
          </Notice>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Notice tone="amber">{notice}</Notice>
        </div>
      )}

      {farms.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-7 w-7" />}
          title={t('farm.empty')}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden /> {t('farm.add')}
              </Button>
              {isDemoMode && (
                <Button variant="secondary" onClick={() => void loadSample()} loading={saving}>
                  {t('farm.loadSample')}
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {farms.map((farm) => {
            const farmPlants = plants.filter((plant) => plant.farm_id === farm.id)
            return (
              <Card as="li" key={farm.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-forest-900">{farm.farm_name}</h2>
                    <p className="mt-0.5 text-xs text-forest-600">
                      Registered {formatDate(farm.created_at, language)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeFarm(farm.id)}
                    className="rounded-lg p-1.5 text-forest-400 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Delete ${farm.farm_name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <dl className="mt-3 space-y-1.5 text-sm text-forest-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-forest-500" aria-hidden />
                    <dt className="sr-only">{t('farm.location')}</dt>
                    <dd>{farm.location || t('common.na')}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-forest-500" aria-hidden />
                    <dt className="sr-only">{t('farm.size')}</dt>
                    <dd>{farm.farm_size || t('common.na')}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-forest-500" aria-hidden />
                    <dt className="sr-only">{t('farm.plants')}</dt>
                    <dd>
                      {farmPlants.length} {t('farm.plants')}
                    </dd>
                  </div>
                </dl>

                {farmPlants.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {farmPlants.map((plant) => (
                      <li key={plant.id}>
                        <Link
                          to={`/plants/${plant.id}`}
                          className="inline-flex rounded-full border border-forest-100 bg-cream/70 px-2.5 py-1 text-xs font-medium text-forest-800 hover:bg-forest-50"
                        >
                          {plant.plant_name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-forest-100 pt-3">
                  <Link to="/plants">
                    <Button size="sm" variant="secondary">
                      {t('nav.plants')}
                    </Button>
                  </Link>
                  <Link to="/plants">
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" aria-hidden /> {t('plants.add')}
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('farm.add')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button form="farm-form" type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="farm-form" onSubmit={createFarm} className="space-y-4">
          <FormRow columns={1}>
            <TextInput
              label={t('farm.name')}
              required
              value={form.farm_name}
              onChange={(event) => setForm({ ...form, farm_name: event.target.value })}
              placeholder="e.g. North field"
            />
          </FormRow>
          <FormRow>
            <TextInput
              label={t('farm.location')}
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
            <TextInput
              label={`${t('farm.size')} (${t('common.optional')})`}
              value={form.farm_size}
              onChange={(event) => setForm({ ...form, farm_size: event.target.value })}
              placeholder="e.g. 1.5 acre"
            />
          </FormRow>
        </form>
      </Modal>
    </Page>
  )
}
