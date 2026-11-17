import type { AlertRecord } from '../types/database'
import type { DataSource } from '../data/dataSource'
import { loadThresholds } from './irrigationService'
import { deriveAlertCandidates } from './plantMonitoringService'

/**
 * Notification and Alert Service.
 *
 * Alerts are derived from records the farmer actually created (observations,
 * sensor readings, open problems) and stored in the `alerts` table. Nothing here
 * generates an alert from invented data or from an AI model's opinion.
 */
export async function syncAlerts(source: DataSource, userId: string): Promise<AlertRecord[]> {
  const [plants, observations, readings, existing] = await Promise.all([
    source.listPlants(userId),
    source.listObservationsForOwner(userId),
    source.listReadingsForOwner(userId, 500),
    source.listAlerts(userId),
  ])

  if (plants.length === 0) return existing

  const candidates = deriveAlertCandidates({
    plants,
    observations,
    readings,
    existingAlerts: existing,
    thresholds: undefined,
  })

  const created: AlertRecord[] = []
  for (const candidate of candidates) {
    // Per-plant thresholds: recompute the dry-soil rule with that plant's values.
    if (candidate.alert_type === 'dry_soil') {
      const thresholds = loadThresholds(candidate.plant_id)
      const reading = readings
        .filter((item) => item.plant_id === candidate.plant_id && item.sensor_type === 'soil_moisture')
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
      if (!reading || reading.reading_value >= thresholds.dry) continue
    }
    created.push(await source.createAlert(candidate))
  }

  return created.length > 0 ? [...created, ...existing] : existing
}
