import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CheckCircle2, FlaskConical, ImageIcon, Info, Sprout, Upload } from 'lucide-react'
import { dataSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader } from '../components/ui/primitives'
import { FormRow, Select, TextArea, TextInput } from '../components/ui/form'
import { SOIL_CONDITIONS, recordObservation } from '../services/observationService'
import { cropClinicConfigured } from '../lib/env'
import { formatDateTime } from '../lib/utils'

const STATUS_TONE = {
  pending: 'amber',
  completed: 'green',
  failed: 'red',
  model_unavailable: 'neutral',
} as const

export default function CropClinicPage() {
  const { t, language } = useLanguage()
  const { plants, observations, userId, refresh } = useAppData()
  const [plantId, setPlantId] = useState('')
  const [cropType, setCropType] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [soil, setSoil] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const photoObservations = useMemo(
    () =>
      observations
        .filter((observation) => observation.image_url)
        .sort((a, b) => b.observation_date.localeCompare(a.observation_date)),
    [observations],
  )

  const plantName = (id: string) => plants.find((plant) => plant.id === id)?.plant_name ?? '—'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) return
    if (!plantId) {
      setError('Choose which plant this photo belongs to.')
      return
    }
    if (!file) {
      setError('Choose a photo of the leaf or crop first.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await recordObservation({
        source: dataSource,
        userId,
        plantId,
        cropType: cropType.trim() || plants.find((plant) => plant.id === plantId)?.crop_type || null,
        language,
        file,
        symptoms: symptoms.trim() || null,
        soilCondition: soil || null,
        notes: notes.trim() || null,
      })
      setNotice(
        result.analysis?.status === 'completed'
          ? `Saved. ${result.analysis.message}`
          : 'Photo saved to the plant history. Crop image analysis is not connected yet, so no condition has been identified.',
      )
      setFile(null)
      setPreview(null)
      setSymptoms('')
      setSoil('')
      setNotes('')
      setCropType('')
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the photo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        icon={<Camera className="h-5 w-5" />}
        title={t('clinic.title')}
        subtitle={t('clinic.subtitle')}
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
          <Notice tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
            {notice}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-lg font-bold text-forest-900">{t('clinic.upload')}</h2>

          <Notice tone={cropClinicConfigured ? 'green' : 'amber'} icon={<Info className="h-4 w-4" />}>
            <p className="font-semibold">
              {cropClinicConfigured ? t('clinic.connectedTitle') : t('clinic.notConnectedTitle')}
            </p>
            <p className="mt-0.5">
              {cropClinicConfigured ? t('clinic.connectedBody') : t('clinic.notConnectedBody')}
            </p>
          </Notice>

          {plants.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Sprout className="h-6 w-6" />}
                title={t('plants.empty')}
                action={
                  <Link to="/plants">
                    <Button variant="secondary">{t('plants.add')}</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <FormRow>
                <Select label={t('clinic.plant')} required value={plantId} onChange={(event) => setPlantId(event.target.value)}>
                  <option value="">—</option>
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.plant_name} ({plant.crop_type})
                    </option>
                  ))}
                </Select>
                <TextInput
                  label={`${t('clinic.crop')} (${t('common.optional')})`}
                  value={cropType}
                  onChange={(event) => setCropType(event.target.value)}
                  placeholder="Defaults to the plant's crop"
                />
              </FormRow>

              <div>
                <label
                  htmlFor="clinic-file"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-forest-200 bg-cream/50 px-4 py-8 text-center hover:border-forest-400"
                >
                  <Upload className="h-6 w-6 text-forest-600" aria-hidden />
                  <span className="text-sm font-semibold text-forest-900">
                    {file ? file.name : 'Take or choose a photo of the leaf or crop'}
                  </span>
                  <span className="text-xs text-forest-600">JPG or PNG · good daylight helps</span>
                </label>
                <input
                  id="clinic-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null
                    setFile(next)
                    setPreview(next ? URL.createObjectURL(next) : null)
                  }}
                />
                {preview && (
                  <img
                    src={preview}
                    alt="Selected crop photo preview"
                    className="mt-3 max-h-64 w-full rounded-xl border border-forest-100 object-cover"
                  />
                )}
              </div>

              <TextArea
                label={t('clinic.symptoms')}
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="e.g. Brown spots with yellow edges on lower leaves, started 5 days ago"
              />
              <FormRow>
                <Select label={t('plants.soil')} value={soil} onChange={(event) => setSoil(event.target.value)}>
                  <option value="">—</option>
                  {SOIL_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </Select>
                <TextInput
                  label={`${t('clinic.notes')} (${t('common.optional')})`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </FormRow>

              <Button type="submit" loading={saving} size="lg">
                <Camera className="h-4 w-4" aria-hidden /> {t('clinic.submit')}
              </Button>
            </form>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
              <FlaskConical className="h-4 w-4" aria-hidden /> {t('clinic.requirements')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-forest-700">
              The analysis runs in a separate Python/FastAPI service.{' '}
              {cropClinicConfigured
                ? 'This app is configured to call it for every saved photo.'
                : 'To activate it:'}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-forest-800">
              <li>Deploy the crop-disease model service with a <code className="rounded bg-cream px-1">/analyze</code> endpoint.</li>
              <li>Set <code className="rounded bg-cream px-1">VITE_CROP_CLINIC_URL</code> to its base URL.</li>
              <li>Keep model credentials on that service, never in this app.</li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-forest-600">
              Photos are always stored with the plant and carry their analysis status. CropSentinel itself never
              infers a condition or a confidence value.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">{t('clinic.history')}</h2>
            {photoObservations.length === 0 ? (
              <p className="mt-2 text-sm text-forest-600">{t('clinic.empty')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {photoObservations.slice(0, 8).map((observation) => (
                  <li key={observation.id} className="flex gap-2.5">
                    <img
                      src={observation.image_url ?? undefined}
                      alt={`Saved crop photo for ${plantName(observation.plant_id)}`}
                      className="h-14 w-14 shrink-0 rounded-lg border border-forest-100 object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-forest-900">{plantName(observation.plant_id)}</p>
                      <p className="text-[0.7rem] text-forest-600">
                        {formatDateTime(observation.observation_date, language)}
                      </p>
                      <Badge tone={STATUS_TONE[observation.analysis_status]} className="mt-1">
                        {t(`clinic.status.${observation.analysis_status}` as 'clinic.status.pending')}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {photoObservations.length > 0 && (
              <Link
                to={`/plants/${photoObservations[0].plant_id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
              >
                <ImageIcon className="h-3.5 w-3.5" aria-hidden /> {t('plants.timeline')}
              </Link>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
