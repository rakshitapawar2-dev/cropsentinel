import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  Camera,
  Droplets,
  ImageIcon,
  MapPin,
  Plus,
  Sprout,
  Trash2,
} from 'lucide-react'
import { dataSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader, Stat } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { FormRow, Select, TextArea, TextInput } from '../components/ui/form'
import { HealthBadge } from '../components/plants/HealthBadge'
import { SOIL_CONDITIONS, recordObservation } from '../services/observationService'
import { observationTrend, summarizePlant } from '../services/plantMonitoringService'
import { classifyMoisture, latestSoilMoisture, loadThresholds } from '../services/irrigationService'
import { formatDate, formatDateTime, relativeTime } from '../lib/utils'

const ANALYSIS_TONE = {
  pending: 'amber',
  completed: 'green',
  failed: 'red',
  model_unavailable: 'neutral',
} as const

export default function PlantDetailPage() {
  const { plantId } = useParams<{ plantId: string }>()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { plants, farms, observations, alerts, readings, userId, refresh } = useAppData()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ symptoms: '', soil_condition: '', notes: '' })

  const plant = plants.find((item) => item.id === plantId) ?? null
  const farm = farms.find((item) => item.id === plant?.farm_id) ?? null
  const plantObservations = useMemo(
    () =>
      observations
        .filter((observation) => observation.plant_id === plantId)
        .sort((a, b) => b.observation_date.localeCompare(a.observation_date)),
    [observations, plantId],
  )
  const plantAlerts = alerts.filter((alert) => alert.plant_id === plantId)
  const plantReadings = readings.filter((reading) => reading.plant_id === plantId)
  const thresholds = loadThresholds(plantId)
  const moisture = latestSoilMoisture(plantReadings)
  const summary = plant ? summarizePlant(plant, plantObservations, alerts, readings, thresholds) : null
  const trend = observationTrend(plantObservations)

  async function saveObservation(event: React.FormEvent) {
    event.preventDefault()
    if (!plant || !userId) return
    setSaving(true)
    setError(null)
    try {
      const result = await recordObservation({
        source: dataSource,
        userId,
        plantId: plant.id,
        cropType: plant.crop_type,
        language,
        file,
        symptoms: form.symptoms.trim() || null,
        soilCondition: form.soil_condition || null,
        notes: form.notes.trim() || null,
      })
      setNotice(
        result.analysis && !result.analysis.available
          ? 'Observation saved. Crop image analysis is not connected yet, so the photo is stored for future analysis.'
          : 'Observation saved.',
      )
      setForm({ symptoms: '', soil_condition: '', notes: '' })
      setFile(null)
      setOpen(false)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the observation.')
    } finally {
      setSaving(false)
    }
  }

  async function removePlant() {
    if (!plant) return
    if (!window.confirm(`Delete ${plant.plant_name} and its observations? This cannot be undone.`)) return
    try {
      await dataSource.deletePlant(plant.id)
      await refresh()
      navigate('/plants')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the plant.')
    }
  }

  if (!plant) {
    return (
      <Page>
        <EmptyState
          icon={<Sprout className="h-7 w-7" />}
          title="Plant not found"
          body="This plant may have been deleted, or it belongs to another account."
          action={
            <Link to="/plants">
              <Button variant="secondary">{t('nav.plants')}</Button>
            </Link>
          }
        />
      </Page>
    )
  }

  return (
    <Page>
      <Link
        to="/plants"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('plants.title')}
      </Link>

      <PageHeader
        icon={<Sprout className="h-5 w-5" />}
        title={plant.plant_name}
        subtitle={`${plant.crop_type}${plant.variety ? ` · ${plant.variety}` : ''}${farm ? ` · ${farm.farm_name}` : ''}`}
        actions={
          <>
            {summary && <HealthBadge level={summary.level} />}
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> {t('plants.addObservation')}
            </Button>
            <Button variant="ghost" onClick={() => void removePlant()} aria-label={t('plants.delete')}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </>
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
          <Notice tone="green">{notice}</Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">{t('plants.detail')}</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-forest-600">{t('plants.planted')}</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-forest-900">
                <CalendarDays className="h-4 w-4 text-forest-500" aria-hidden />
                {plant.planting_date ? formatDate(plant.planting_date, language) : t('common.na')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-forest-600">{t('plants.stage')}</dt>
              <dd className="text-sm font-medium text-forest-900">{plant.growth_stage || t('common.na')}</dd>
            </div>
            <div>
              <dt className="text-xs text-forest-600">{t('plants.locationLabel')}</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-forest-900">
                <MapPin className="h-4 w-4 text-forest-500" aria-hidden />
                {plant.location_label || t('common.na')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-forest-600">Registered</dt>
              <dd className="text-sm font-medium text-forest-900">{formatDate(plant.created_at, language)}</dd>
            </div>
          </dl>
          {plant.notes && (
            <div className="mt-4 rounded-xl bg-cream/70 p-3">
              <p className="text-xs font-semibold text-forest-600">{t('plants.notes')}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{plant.notes}</p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">{t('plants.health')}</h2>
          <div className="mt-3">
            <HealthBadge level={summary?.level ?? 'unknown'} />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-forest-800">
            {(summary?.reasons ?? []).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-400" />
                {reason}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label={t('plants.observations')} value={plantObservations.length} />
            <Stat
              label={t('irrigation.moisture')}
              value={moisture ? `${moisture.reading_value}${moisture.unit}` : '—'}
              hint={
                moisture
                  ? (t(`irrigation.moisture.${classifyMoisture(moisture.reading_value, thresholds)}` as 'irrigation.moisture.unknown'))
                  : t('irrigation.moisture.unknown')
              }
            />
          </div>
          <p className="mt-3 text-xs text-forest-600">
            {trend === 'unknown'
              ? 'Two observations are needed before a change over time can be described.'
              : `Trend from your two latest observations: ${trend}.`}
          </p>
          <Link
            to="/irrigation"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
          >
            <Droplets className="h-3.5 w-3.5" aria-hidden /> {t('nav.irrigation')}
          </Link>
        </Card>
      </div>

      {plantAlerts.length > 0 && (
        <Card className="mt-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
            <BellRing className="h-4 w-4" aria-hidden /> {t('plants.alerts')}
          </h2>
          <ul className="mt-3 space-y-2">
            {plantAlerts.map((alert) => (
              <li key={alert.id} className="rounded-xl border border-forest-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}>
                    {t(`alerts.severity.${alert.severity}` as 'alerts.severity.warning')}
                  </Badge>
                  <p className="text-sm font-semibold text-forest-900">{alert.title}</p>
                  <span className="ml-auto text-xs text-forest-600">{relativeTime(alert.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-forest-700">{alert.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="mt-6" aria-labelledby="observations-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="observations-heading" className="text-lg font-bold text-forest-900">
            {t('plants.observations')}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <Camera className="h-4 w-4" aria-hidden /> {t('plants.addObservation')}
          </Button>
        </div>

        {plantObservations.length === 0 ? (
          <EmptyState icon={<ImageIcon className="h-7 w-7" />} title={t('plants.noObservations')} />
        ) : (
          <ol className="relative space-y-3 border-l border-forest-200 pl-4 sm:pl-6">
            {plantObservations.map((observation) => (
              <li key={observation.id} className="relative">
                <span
                  className="absolute -left-[1.42rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-forest-500 sm:-left-[1.92rem]"
                  aria-hidden
                />
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-forest-900">
                      {formatDateTime(observation.observation_date, language)}
                    </p>
                    <Badge tone={ANALYSIS_TONE[observation.analysis_status]}>
                      {t(`clinic.status.${observation.analysis_status}` as 'clinic.status.pending')}
                    </Badge>
                    <span className="ml-auto text-xs text-forest-600">{relativeTime(observation.observation_date)}</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    {observation.image_url && (
                      <a
                        href={observation.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 overflow-hidden rounded-xl border border-forest-100"
                      >
                        <img
                          src={observation.image_url}
                          alt={`Crop photo from ${formatDateTime(observation.observation_date, language)}`}
                          className="h-28 w-full object-cover sm:w-36"
                          loading="lazy"
                        />
                      </a>
                    )}
                    <div className="min-w-0 space-y-1.5 text-sm">
                      <p>
                        <span className="font-semibold text-forest-800">{t('plants.symptoms')}: </span>
                        <span className="text-ink">{observation.symptoms || t('common.na')}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-forest-800">{t('plants.soil')}: </span>
                        <span className="text-ink">{observation.soil_condition || t('common.na')}</span>
                      </p>
                      {observation.analysis_result && (
                        <p>
                          <span className="font-semibold text-forest-800">{t('clinic.result')}: </span>
                          <span className="text-ink">{observation.analysis_result}</span>
                        </p>
                      )}
                      {observation.confidence_score !== null && (
                        <p>
                          <span className="font-semibold text-forest-800">{t('clinic.confidence')}: </span>
                          <span className="text-ink">{Math.round(observation.confidence_score * 100)}%</span>
                        </p>
                      )}
                      {observation.farmer_notes && (
                        <p className="rounded-lg bg-cream/70 p-2 text-xs text-forest-800">{observation.farmer_notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('plants.addObservation')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button form="observation-form" type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="observation-form" onSubmit={saveObservation} className="space-y-4">
          <Notice tone="neutral" icon={<Camera className="h-4 w-4" />}>
            {t('clinic.notConnectedTitle')} {t('clinic.notConnectedBody')}
          </Notice>
          <TextArea
            label={t('plants.symptoms')}
            value={form.symptoms}
            onChange={(event) => setForm({ ...form, symptoms: event.target.value })}
            placeholder="e.g. Lower leaves turning yellow, small brown spots"
          />
          <FormRow>
            <Select
              label={t('plants.soil')}
              value={form.soil_condition}
              onChange={(event) => setForm({ ...form, soil_condition: event.target.value })}
            >
              <option value="">—</option>
              {SOIL_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </Select>
            <TextInput
              label={t('plants.image')}
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </FormRow>
          <TextArea
            label={t('plants.notesFarmer')}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </form>
      </Modal>
    </Page>
  )
}
