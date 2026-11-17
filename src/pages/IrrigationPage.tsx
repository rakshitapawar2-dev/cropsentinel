import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Droplets, Gauge, Lock, Power, Radio, Sprout } from 'lucide-react'
import type { IrrigationEvent } from '../types/database'
import { dataSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader, Stat } from '../components/ui/primitives'
import { Field, FormRow, TextInput } from '../components/ui/form'
import {
  DEFAULT_THRESHOLDS,
  classifyMoisture,
  isReadingStale,
  latestSoilMoisture,
  loadThresholds,
  pumpStatusFromEvents,
  saveThresholds,
} from '../services/irrigationService'
import { formatDateTime, relativeTime } from '../lib/utils'

export default function IrrigationPage() {
  const { t, language } = useLanguage()
  const { plants, readings, userId } = useAppData()
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [events, setEvents] = useState<IrrigationEvent[]>([])
  const [draftThresholds, setDraftThresholds] = useState(DEFAULT_THRESHOLDS)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!userId) return
      try {
        const loaded = await dataSource.listIrrigationEventsForOwner(userId)
        if (active) setEvents(loaded)
      } catch {
        if (active) setEvents([])
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [userId])

  const activePlant = plants.find((plant) => plant.id === selectedPlantId) ?? plants[0] ?? null

  useEffect(() => {
    if (activePlant) setDraftThresholds(loadThresholds(activePlant.id))
  }, [activePlant])

  const plantReadings = useMemo(
    () =>
      activePlant
        ? readings
            .filter((reading) => reading.plant_id === activePlant.id && reading.sensor_type === 'soil_moisture')
            .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
        : [],
    [readings, activePlant],
  )
  const latest = latestSoilMoisture(plantReadings)
  const thresholds = activePlant ? loadThresholds(activePlant.id) : DEFAULT_THRESHOLDS
  const status = classifyMoisture(latest?.reading_value, thresholds)
  const plantEvents = activePlant
    ? events.filter((event) => event.plant_id === activePlant.id)
    : events
  const pumpStatus = pumpStatusFromEvents(plantEvents)
  const historyBars = plantReadings.slice(-14)

  function save() {
    if (!activePlant) return
    saveThresholds(activePlant.id, draftThresholds)
    setSavedMessage(
      `Thresholds saved for ${activePlant.plant_name} in this browser. They are stored per device until the plants table carries them.`,
    )
  }

  return (
    <Page>
      <PageHeader
        icon={<Droplets className="h-5 w-5" />}
        title={t('irrigation.title')}
        subtitle={t('irrigation.subtitle')}
      />

      {plants.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-7 w-7" />}
          title={t('plants.empty')}
          body={t('irrigation.notConnectedBody')}
          action={
            <Link to="/plants">
              <Button variant="secondary">{t('plants.add')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor="irrigation-plant" className="text-xs font-semibold uppercase tracking-wide text-forest-600">
                    {t('irrigation.plant')}
                  </label>
                  <select
                    id="irrigation-plant"
                    value={activePlant?.id ?? ''}
                    onChange={(event) => {
                      setSelectedPlantId(event.target.value)
                      setSavedMessage(null)
                    }}
                    className="mt-1 block w-full max-w-xs rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm font-medium text-forest-900 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-200"
                  >
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.plant_name} ({plant.crop_type})
                      </option>
                    ))}
                  </select>
                </div>
                <Badge tone={latest ? 'green' : 'neutral'}>
                  <Radio className="h-3.5 w-3.5" aria-hidden />
                  {latest ? 'Readings arriving' : 'No readings received'}
                </Badge>
              </div>

              {latest ? (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Stat
                      label={t('irrigation.moisture')}
                      value={`${latest.reading_value}${latest.unit}`}
                      hint={formatDateTime(latest.recorded_at, language)}
                    />
                    <Stat label={t('irrigation.status')} value={t(`irrigation.moisture.${status}` as 'irrigation.moisture.unknown')} />
                    <Stat label={t('irrigation.lastReading')} value={relativeTime(latest.recorded_at)} />
                  </div>
                  {isReadingStale(latest) && (
                    <div className="mt-3">
                      <Notice tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
                        This reading is older than 90 minutes. Check the sensor or gateway before relying on it.
                      </Notice>
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Recent readings</p>
                    <ul className="mt-2 flex h-24 items-end gap-1.5" aria-label="Recent soil moisture readings">
                      {historyBars.map((reading) => (
                        <li key={reading.id} className="flex flex-1 flex-col items-center justify-end gap-1">
                          <span
                            className="w-full rounded-t bg-forest-400/80"
                            style={{ height: `${Math.min(100, Math.max(6, reading.reading_value))}%` }}
                            title={`${reading.reading_value}${reading.unit} · ${formatDateTime(reading.recorded_at, language)}`}
                          />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-forest-600">
                      {historyBars[0] && formatDateTime(historyBars[0].recorded_at, language)} →{' '}
                      {historyBars[historyBars.length - 1] &&
                        formatDateTime(historyBars[historyBars.length - 1].recorded_at, language)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon={<Droplets className="h-7 w-7" />}
                    title={t('irrigation.notConnectedTitle')}
                    body={t('irrigation.notConnectedBody')}
                  />
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">{t('irrigation.history')}</h2>
              {plantEvents.length === 0 ? (
                <p className="mt-2 text-sm text-forest-600">{t('irrigation.emptyHistory')}</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-forest-600">
                      <tr>
                        <th className="py-2 pr-3 font-semibold">Started</th>
                        <th className="py-2 pr-3 font-semibold">Type</th>
                        <th className="py-2 pr-3 font-semibold">Before</th>
                        <th className="py-2 pr-3 font-semibold">After</th>
                        <th className="py-2 font-semibold">{t('irrigation.pump')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forest-100">
                      {plantEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="py-2 pr-3 text-forest-800">{formatDateTime(event.started_at, language)}</td>
                          <td className="py-2 pr-3 text-forest-800">{event.event_type.replace('_', ' ')}</td>
                          <td className="py-2 pr-3 text-forest-800">
                            {event.moisture_before !== null ? `${event.moisture_before}%` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-forest-800">
                            {event.moisture_after !== null ? `${event.moisture_after}%` : '—'}
                          </td>
                          <td className="py-2 text-forest-800">{event.pump_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
                <Gauge className="h-4 w-4" aria-hidden /> {t('irrigation.thresholds')}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-forest-600">{t('irrigation.thresholdNote')}</p>
              <div className="mt-3 space-y-3">
                <FormRow>
                  <Field label={`${t('irrigation.dryBelow')} (%)`}>
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      value={draftThresholds.dry}
                      onChange={(event) =>
                        setDraftThresholds({ ...draftThresholds, dry: Number(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label={`${t('irrigation.moistAbove')} (%)`}>
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      value={draftThresholds.moist}
                      onChange={(event) =>
                        setDraftThresholds({ ...draftThresholds, moist: Number(event.target.value) })
                      }
                    />
                  </Field>
                </FormRow>
                <Button size="sm" variant="secondary" onClick={save} disabled={!activePlant}>
                  {t('common.save')}
                </Button>
                {savedMessage && <p className="text-xs leading-relaxed text-forest-700">{savedMessage}</p>}
              </div>
            </Card>

            <Card>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-600">
                <Power className="h-4 w-4" aria-hidden /> {t('irrigation.pump')}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={pumpStatus === 'on' ? 'green' : pumpStatus === 'off' ? 'neutral' : 'neutral'}>
                  {pumpStatus === 'on'
                    ? t('irrigation.pumpOn')
                    : pumpStatus === 'off'
                      ? t('irrigation.pumpOff')
                      : t('irrigation.pumpUnknown')}
                </Badge>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-cream/80 p-3 text-xs leading-relaxed text-forest-700">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold text-forest-900">{t('irrigation.pumpLocked')}</p>
                  <p className="mt-0.5">{t('irrigation.pumpLockedBody')}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest-600">Arduino setup</h2>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-forest-700">
                <li>Arduino Uno + capacitive soil-moisture sensor</li>
                <li>Relay module + DC mini pump + reservoir</li>
                <li>Local gateway that writes readings to <code className="rounded bg-cream px-1">sensor_readings</code></li>
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-forest-600">
                Readings must arrive through the authenticated{' '}
                <code className="rounded bg-cream px-1">sensor-ingest</code> function (see
                docs/INTEGRATIONS.md). This app only reads them and never activates a pump.
              </p>
            </Card>
          </div>
        </div>
      )}
    </Page>
  )
}
