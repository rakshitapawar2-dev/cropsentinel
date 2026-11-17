import type { AnalysisStatus, Language } from '../types/database'
import { cropClinicConfigured, env } from '../lib/env'

/**
 * Crop Clinic Service.
 *
 * Integration point for a separate Python/FastAPI crop-disease model.
 * Contract (documented in docs/INTEGRATIONS.md):
 *
 *   POST {VITE_CROP_CLINIC_URL}/analyze
 *   { "image_url": "...", "crop_type": "Tomato", "symptoms": "...", "plant_id": "..." }
 *   -> 200 { "conditions": [{ "name": "Early blight", "confidence": 0.72 }],
 *            "model_version": "..." }
 *
 * Until that service exists, this module returns `available: false`. It never
 * invents conditions or confidence values.
 */

export const CROP_CLINIC_NOT_CONNECTED =
  'Crop image analysis is not connected yet. Your image can be saved for future analysis.'

export interface CropAnalysisCondition {
  name: string
  confidence: number | null
}

export interface CropAnalysisOutcome {
  available: boolean
  status: AnalysisStatus
  conditions: CropAnalysisCondition[]
  message: string
  modelVersion: string | null
}

export interface CropAnalysisInput {
  imageUrl: string
  cropType: string | null
  symptoms: string | null
  plantId: string
  language: Language
}

export async function analyseCropImage(input: CropAnalysisInput): Promise<CropAnalysisOutcome> {
  if (!cropClinicConfigured) {
    return {
      available: false,
      status: 'model_unavailable',
      conditions: [],
      message: CROP_CLINIC_NOT_CONNECTED,
      modelVersion: null,
    }
  }

  try {
    const response = await fetch(`${env.cropClinicUrl.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: input.imageUrl,
        crop_type: input.cropType,
        symptoms: input.symptoms,
        plant_id: input.plantId,
        language: input.language,
      }),
    })

    if (!response.ok) {
      return {
        available: true,
        status: 'failed',
        conditions: [],
        message: `The crop analysis service answered with ${response.status}. Your photo is saved; try again later.`,
        modelVersion: null,
      }
    }

    const payload = (await response.json()) as {
      conditions?: Array<{ name?: unknown; confidence?: unknown }>
      model_version?: string
      message?: string
    }

    const conditions: CropAnalysisCondition[] = (payload.conditions ?? [])
      .filter((item): item is { name: string; confidence?: unknown } => typeof item.name === 'string' && item.name.length > 0)
      .map((item) => ({
        name: item.name,
        confidence: typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1 ? item.confidence : null,
      }))

    if (conditions.length === 0) {
      return {
        available: true,
        status: 'failed',
        conditions: [],
        message:
          payload.message ??
          'The model did not return any supported condition. Take another photo in better light, or add more detail about what you see.',
        modelVersion: payload.model_version ?? null,
      }
    }

    return {
      available: true,
      status: 'completed',
      conditions,
      message: 'Possible conditions suggested by the crop image model. This is not a confirmed diagnosis.',
      modelVersion: payload.model_version ?? null,
    }
  } catch (error) {
    return {
      available: true,
      status: 'failed',
      conditions: [],
      message: `The crop analysis service could not be reached (${error instanceof Error ? error.message : 'network error'}). Your photo is saved.`,
      modelVersion: null,
    }
  }
}

/** Text stored in `observations.analysis_result` — only real model output. */
export function describeAnalysis(outcome: CropAnalysisOutcome, language: Language): string {
  void language
  if (!outcome.available || outcome.status !== 'completed') return outcome.message
  const list = outcome.conditions
    .map((condition) =>
      condition.confidence !== null ? `${condition.name} (${Math.round(condition.confidence * 100)}%)` : condition.name,
    )
    .join('; ')
  return `${list}. ${outcome.message}`
}
