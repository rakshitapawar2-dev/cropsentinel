import type { Language, Observation } from '../types/database'
import type { DataSource } from '../data/dataSource'
import { analyseCropImage, describeAnalysis, type CropAnalysisOutcome } from './cropClinicService'

/**
 * Plant Monitoring Service — observation recording.
 * Uploads the photo, asks the (optional) crop model, and stores exactly what
 * came back. When no model is connected the observation is saved with
 * `analysis_status: 'model_unavailable'` and no confidence score.
 */
export interface RecordObservationInput {
  source: DataSource
  userId: string
  plantId: string
  cropType: string | null
  language: Language
  file?: File | null
  imageUrl?: string | null
  symptoms: string | null
  soilCondition: string | null
  notes: string | null
}

export interface RecordObservationResult {
  observation: Observation
  analysis: CropAnalysisOutcome | null
}

export async function recordObservation(input: RecordObservationInput): Promise<RecordObservationResult> {
  const { source, userId, plantId, cropType, language, file, symptoms, soilCondition, notes } = input

  const imageUrl = file ? await source.uploadCropImage(file, userId) : (input.imageUrl ?? null)

  let analysis: CropAnalysisOutcome | null = null
  if (imageUrl) {
    analysis = await analyseCropImage({ imageUrl, cropType, symptoms, plantId, language })
  }

  const observation = await source.createObservation({
    plant_id: plantId,
    observation_date: new Date().toISOString(),
    image_url: imageUrl,
    symptoms,
    soil_condition: soilCondition,
    analysis_status: analysis ? analysis.status : 'pending',
    analysis_result: analysis ? describeAnalysis(analysis, language) : null,
    confidence_score:
      analysis?.status === 'completed' && analysis.conditions[0]?.confidence !== null
        ? analysis.conditions[0]?.confidence ?? null
        : null,
    farmer_notes: notes,
    follow_up_status: 'open',
  })

  return { observation, analysis }
}

/** Suggested soil-condition options, stored as free text so they stay editable. */
export const SOIL_CONDITIONS = ['Dry', 'Slightly moist', 'Moist', 'Waterlogged'] as const

export const GROWTH_STAGES = [
  'Seedling',
  'Vegetative',
  'Flowering',
  'Fruiting',
  'Harvest ready',
  'Dormant',
] as const

export const CROP_SUGGESTIONS = ['Tomato', 'Chilli', 'Rice', 'Wheat', 'Maize', 'Cotton', 'Onion', 'Groundnut', 'Sugarcane', 'Banana']
