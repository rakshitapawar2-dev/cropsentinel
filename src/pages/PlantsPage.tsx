import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Droplets, Plus, Sprout } from 'lucide-react'
import { dataSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Button, Card, EmptyState, Notice, Page, PageHeader } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { FormRow, Select, TextArea, TextInput } from '../components/ui/form'
import { HealthBadge } from '../components/plants/HealthBadge'
import { CROP_SUGGESTIONS, GROWTH_STAGES } from '../services/observationService'
import { formatDate, relativeTime } from '../lib/utils'
import { classifyMoisture, loadThresholds } from '../services/irrigationService'

export default function PlantsPage() {
  const { t, language } = useLanguage()
  const { farms, plants, summaries, refresh } = useAppData()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    farm_id: farms[0]?.id ?? '',
    plant_name: '',
    crop_type: '',
    variety: '',
    planting_date: '',
    growth_stage: '',
    location_label: '',
    notes: '',
  })

  async function createPlant(event: React.FormEvent) {
    event.preventDefault()
    const farmId = form.farm_id || farms[0]?.id || ''
    if (!farmId || !form.plant_name.trim() || !form.crop_type.trim()) {
      setError('Farm, plant name and crop type are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await dataSource.createPlant({
        farm_id: farmId,
        plant_name: form.plant_name.trim(),
        crop_type: form.crop_type.trim(),
        variety: form.variety.trim() || null,
        planting_date: form.planting_date || null,
        growth_stage: form.growth_stage || null,
        location_label: form.location_label.trim() || null,
        notes: form.notes.trim() || null,
      })
      setOpen(false)
      setForm({
        farm_id: farms[0]?.id ?? '',
        plant_name: '',
        crop_type: '',
        variety: '',
        planting_date: '',
        growth_stage: '',
        location_label: '',
        notes: '',
      })
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the plant.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        icon={<Sprout className="h-5 w-5" />}
        title={t('plants.title')}
        subtitle={t('plants.subtitle')}
        actions={
          <Button onClick={() => setOpen(true)} disabled={farms.length === 0}>
            <Plus className="h-4 w-4" aria-hidden /> {t('plants.add')}
          </Button>
        }
      />

      {farms.length === 0 && (
        <div className="mb-4">
          <Notice tone="amber" title={t('plants.selectFarm')}>
            {t('farm.empty')} <Link to="/farm" className="font-semibold underline">{t('farm.add')}</Link>
          </Notice>
        </div>
      )}

      {plants.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-7 w-7" />}
          title={t('plants.empty')}
          action={
            <Button onClick={() => setOpen(true)} disabled={farms.length === 0}>
              <Plus className="h-4 w-4" aria-hidden /> {t('plants.add')}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => {
            const farm = farms.find((item) => item.id === summary.plant.farm_id)
            const moistureStatus = summary.latestMoisture
              ? classifyMoisture(summary.latestMoisture.reading_value, loadThresholds(summary.plant.id))
              : 'unknown'
            return (
              <Card as="li" key={summary.plant.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-forest-900">{summary.plant.plant_name}</h2>
                    <p className="truncate text-xs text-forest-600">
                      {summary.plant.crop_type}
                      {summary.plant.variety ? ` · ${summary.plant.variety}` : ''} · {farm?.farm_name ?? '—'}
                    </p>
                  </div>
                  <HealthBadge level={summary.level} />
                </div>

                <dl className="mt-3 space-y-1.5 text-xs text-forest-700">
                  <div className="flex justify-between gap-2">
                    <dt>{t('plants.stage')}</dt>
                    <dd className="font-medium text-forest-900">{summary.plant.growth_stage || t('common.na')}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>{t('plants.planted')}</dt>
                    <dd className="font-medium text-forest-900">
                      {summary.plant.planting_date ? formatDate(summary.plant.planting_date, language) : t('common.na')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>{t('plants.lastObserved')}</dt>
                    <dd className="font-medium text-forest-900">
                      {summary.lastObservation ? relativeTime(summary.lastObservation.observation_date) : t('common.na')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5" aria-hidden /> {t('irrigation.moisture')}
                    </dt>
                    <dd className="font-medium text-forest-900">
                      {summary.latestMoisture
                        ? `${summary.latestMoisture.reading_value}${summary.latestMoisture.unit} · ${t(
                            `irrigation.moisture.${moistureStatus}` as 'irrigation.moisture.unknown',
                          )}`
                        : t('irrigation.moisture.unknown')}
                    </dd>
                  </div>
                </dl>

                {summary.reasons.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-forest-600">{summary.reasons[0]}</p>
                )}

                <Link
                  to={`/plants/${summary.plant.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 self-start border-t border-forest-100 pt-3 text-sm font-semibold text-forest-700 hover:text-forest-900"
                >
                  {t('plants.detail')} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Card>
            )
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('plants.add')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button form="plant-form" type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="plant-form" onSubmit={createPlant} className="space-y-4">
          {error && <Notice tone="red">{error}</Notice>}
          <FormRow>
            <Select
              label={t('plants.farm')}
              required
              value={form.farm_id}
              onChange={(event) => setForm({ ...form, farm_id: event.target.value })}
            >
              <option value="">—</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.farm_name}
                </option>
              ))}
            </Select>
            <TextInput
              label={t('plants.name')}
              required
              value={form.plant_name}
              onChange={(event) => setForm({ ...form, plant_name: event.target.value })}
              placeholder="e.g. Tomato bed A"
            />
          </FormRow>
          <FormRow>
            <TextInput
              label={t('plants.crop')}
              required
              list="crop-suggestions"
              value={form.crop_type}
              onChange={(event) => setForm({ ...form, crop_type: event.target.value })}
            />
            <datalist id="crop-suggestions">
              {CROP_SUGGESTIONS.map((crop) => (
                <option key={crop} value={crop} />
              ))}
            </datalist>
            <TextInput
              label={`${t('plants.variety')} (${t('common.optional')})`}
              value={form.variety}
              onChange={(event) => setForm({ ...form, variety: event.target.value })}
            />
          </FormRow>
          <FormRow>
            <TextInput
              label={t('plants.planted')}
              type="date"
              value={form.planting_date}
              onChange={(event) => setForm({ ...form, planting_date: event.target.value })}
            />
            <Select
              label={t('plants.stage')}
              value={form.growth_stage}
              onChange={(event) => setForm({ ...form, growth_stage: event.target.value })}
            >
              <option value="">—</option>
              {GROWTH_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow columns={1}>
            <TextInput
              label={`${t('plants.locationLabel')} (${t('common.optional')})`}
              value={form.location_label}
              onChange={(event) => setForm({ ...form, location_label: event.target.value })}
              placeholder="e.g. North side, near the well"
            />
          </FormRow>
          <FormRow columns={1}>
            <TextArea
              label={`${t('plants.notes')} (${t('common.optional')})`}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </FormRow>
        </form>
      </Modal>
    </Page>
  )
}
