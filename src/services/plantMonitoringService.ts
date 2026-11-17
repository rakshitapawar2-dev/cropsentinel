import type {
  AlertRecord,
  NewAlert,
  Observation,
  Plant,
  SensorReading,
} from '../types/database'
import { daysSince } from '../lib/utils'
import { classifyMoisture, latestSoilMoisture, type MoistureThresholds } from './irrigationService'

/**
 * Plant Monitoring Service.
 *
 * Everything here is derived from the farmer's own records. There is no
 * synthetic health score: a plant is only "needs attention" when a recorded
 * observation, an open alert or a real sensor reading says so.
 */

export type HealthLevel = 'attention' | 'watch' | 'healthy' | 'unknown'

export interface PlantHealthSummary {
  plant: Plant
  level: HealthLevel
  reasons: string[]
  lastObservation: Observation | null
  observationCount: number
  openAlerts: AlertRecord[]
  latestMoisture: SensorReading | null
}

const SEVERE_WORDS = [
  'wilt', 'wilting', 'dying', 'dead', 'rot', 'rotting', 'collapse', 'severe', 'spreading', 'many',
]

export function summarizePlant(
  plant: Plant,
  observations: Observation[],
  alerts: AlertRecord[] = [],
  readings: SensorReading[] = [],
  thresholds?: MoistureThresholds,
): PlantHealthSummary {
  const sorted = [...observations].sort((a, b) => b.observation_date.localeCompare(a.observation_date))
  const last = sorted[0] ?? null
  const openAlerts = alerts.filter((alert) => alert.plant_id === plant.id && alert.status !== 'resolved')
  const moisture = latestSoilMoisture(readings.filter((reading) => reading.plant_id === plant.id))
  const reasons: string[] = []
  let level: HealthLevel = 'healthy'

  const escalate = (next: HealthLevel) => {
    const rank: Record<HealthLevel, number> = { unknown: 0, healthy: 1, watch: 2, attention: 3 }
    if (rank[next] > rank[level]) level = next
  }

  if (openAlerts.some((alert) => alert.severity === 'critical' || alert.severity === 'warning')) {
    escalate('attention')
    reasons.push('There is an open alert for this plant.')
  }

  const age = daysSince(last?.observation_date)
  if (!last) {
    escalate('unknown')
    reasons.push('No observation recorded yet — add one to start tracking health.')
  } else {
    const symptoms = (last.symptoms ?? '').toLowerCase()
    if (symptoms.trim().length > 0) {
      const severe = SEVERE_WORDS.some((word) => symptoms.includes(word))
      escalate(severe ? 'attention' : 'watch')
      reasons.push(
        severe
          ? 'The last observation describes serious symptoms. A closer check or expert advice is sensible.'
          : 'Symptoms were recorded in the last observation.',
      )
    }
    if (last.analysis_status === 'failed') {
      escalate('watch')
      reasons.push('The last image could not be analysed.')
    }
    if (age !== null && age >= 21) {
      escalate('watch')
      reasons.push(`Last observation was ${age} days ago. A fresh look would help.`)
    }
  }

  if (moisture) {
    const status = classifyMoisture(moisture.reading_value, thresholds)
    if (status === 'dry') {
      escalate('watch')
      reasons.push('The latest soil-moisture reading is below the dry threshold.')
    }
  }

  if (reasons.length === 0 && last) {
    reasons.push('No problems recorded in your observations.')
  }

  return {
    plant,
    level,
    reasons,
    lastObservation: last,
    observationCount: sorted.length,
    openAlerts,
    latestMoisture: moisture,
  }
}

export function plantsNeedingAttention(summaries: PlantHealthSummary[]): PlantHealthSummary[] {
  return summaries
    .filter((summary) => summary.level === 'attention' || summary.level === 'watch')
    .sort((a, b) => {
      const rank: Record<HealthLevel, number> = { attention: 0, watch: 1, unknown: 2, healthy: 3 }
      return rank[a.level] - rank[b.level]
    })
}

export type TrendDirection = 'improving' | 'worsening' | 'stable' | 'unknown'

/**
 * Compare the two most recent observations. This only uses what was actually
 * recorded (follow-up status, presence of symptoms) — never invented values.
 */
export function observationTrend(observations: Observation[]): TrendDirection {
  const sorted = [...observations].sort((a, b) => b.observation_date.localeCompare(a.observation_date))
  if (sorted.length < 2) return 'unknown'
  const [current, previous] = sorted
  const hasSymptoms = (observation: Observation) => (observation.symptoms ?? '').trim().length > 0
  const resolved = current.follow_up_status === 'resolved'
  if (resolved && hasSymptoms(previous)) return 'improving'
  if (!hasSymptoms(previous) && hasSymptoms(current)) return 'worsening'
  if (hasSymptoms(previous) && hasSymptoms(current)) return 'worsening'
  return 'stable'
}

export interface AlertCandidatesInput {
  plants: Plant[]
  observations: Observation[]
  readings: SensorReading[]
  thresholds?: MoistureThresholds
  existingAlerts: AlertRecord[]
}

/**
 * Derive alert candidates from real records. `alert_type` acts as a dedupe key
 * so re-running this never piles up duplicates.
 */
export function deriveAlertCandidates({
  plants,
  observations,
  readings,
  thresholds,
  existingAlerts,
}: AlertCandidatesInput): NewAlert[] {
  const candidates: NewAlert[] = []
  const alreadyOpen = new Set(
    existingAlerts.filter((alert) => alert.status !== 'resolved').map((alert) => `${alert.plant_id}:${alert.alert_type}`),
  )

  for (const plant of plants) {
    const plantObservations = observations
      .filter((observation) => observation.plant_id === plant.id)
      .sort((a, b) => b.observation_date.localeCompare(a.observation_date))
    const last = plantObservations[0]

    if (!last) {
      if (!alreadyOpen.has(`${plant.id}:no_observations`)) {
        candidates.push({
          plant_id: plant.id,
          alert_type: 'no_observations',
          title: `${plant.plant_name} has no observations yet`,
          description: 'Record what you see so CropSentinel can compare changes over time.',
          severity: 'info',
          status: 'open',
        })
      }
      continue
    }

    const age = daysSince(last.observation_date) ?? 0
    if (age >= 21 && !alreadyOpen.has(`${plant.id}:stale_observation`)) {
      candidates.push({
        plant_id: plant.id,
        alert_type: 'stale_observation',
        title: `${plant.plant_name} has not been checked recently`,
        description: `The last observation was ${age} days ago.`,
        severity: 'warning',
        status: 'open',
      })
    }

    const symptoms = (last.symptoms ?? '').toLowerCase()
    if (
      symptoms.length > 0 &&
      SEVERE_WORDS.some((word) => symptoms.includes(word)) &&
      !alreadyOpen.has(`${plant.id}:serious_symptoms`)
    ) {
      candidates.push({
        plant_id: plant.id,
        alert_type: 'serious_symptoms',
        title: `Serious symptoms recorded for ${plant.plant_name}`,
        description: `You recorded: “${last.symptoms}”. Consider a fresh photo and expert advice.`,
        severity: 'critical',
        status: 'open',
      })
    }

    const moisture = latestSoilMoisture(readings.filter((reading) => reading.plant_id === plant.id))
    if (moisture && classifyMoisture(moisture.reading_value, thresholds) === 'dry' && !alreadyOpen.has(`${plant.id}:dry_soil`)) {
      candidates.push({
        plant_id: plant.id,
        alert_type: 'dry_soil',
        title: `Soil looks dry for ${plant.plant_name}`,
        description: `Latest soil-moisture reading: ${moisture.reading_value}${moisture.unit}. Check the root zone before watering.`,
        severity: 'warning',
        status: 'open',
      })
    }
  }

  return candidates
}
