import type { IrrigationEvent, MoistureStatus, SensorReading } from '../types/database'

/**
 * Irrigation Service.
 *
 * Reads soil-moisture data that arrived from a sensor gateway and classifies it
 * against per-plant thresholds. It never writes hardware commands: pump control
 * is deliberately out of scope until a validated backend function exists.
 */

export interface MoistureThresholds {
  /** Below this percentage the soil is considered dry. */
  dry: number
  /** Above this percentage the soil is considered moist. */
  moist: number
}

export const DEFAULT_THRESHOLDS: MoistureThresholds = { dry: 30, moist: 60 }

const THRESHOLD_KEY = 'cropsentinel.moisture-thresholds'

/** Thresholds are per plant; the defaults are only a starting point. */
export function loadThresholds(plantId?: string | null): MoistureThresholds {
  try {
    const raw = window.localStorage.getItem(THRESHOLD_KEY)
    if (!raw) return DEFAULT_THRESHOLDS
    const all = JSON.parse(raw) as Record<string, MoistureThresholds>
    return (plantId && all[plantId]) || DEFAULT_THRESHOLDS
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function saveThresholds(plantId: string, thresholds: MoistureThresholds): void {
  try {
    const raw = window.localStorage.getItem(THRESHOLD_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, MoistureThresholds>) : {}
    all[plantId] = thresholds
    window.localStorage.setItem(THRESHOLD_KEY, JSON.stringify(all))
  } catch {
    /* non-fatal: the classification just keeps using defaults */
  }
}

export function classifyMoisture(
  value: number | null | undefined,
  thresholds: MoistureThresholds = DEFAULT_THRESHOLDS,
): MoistureStatus {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown'
  if (value < thresholds.dry) return 'dry'
  if (value > thresholds.moist) return 'moist'
  return 'moderate'
}

export function latestReading(readings: SensorReading[]): SensorReading | null {
  if (readings.length === 0) return null
  return [...readings].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
}

export function latestSoilMoisture(readings: SensorReading[]): SensorReading | null {
  return latestReading(readings.filter((reading) => reading.sensor_type === 'soil_moisture'))
}

/** A reading older than this is shown as stale rather than current. */
export const STALE_READING_MINUTES = 90

export function isReadingStale(reading: SensorReading | null): boolean {
  if (!reading) return false
  const age = Date.now() - new Date(reading.recorded_at).getTime()
  return age > STALE_READING_MINUTES * 60_000
}

export function pumpStatusFromEvents(events: IrrigationEvent[]): 'on' | 'off' | 'unknown' {
  const latest = [...events].sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
  return latest?.pump_status ?? 'unknown'
}
