import type { AlertRecord, Language, Observation, Plant, SensorReading, VerificationStatus } from '../types/database'
import type { DataSource } from '../data/dataSource'
import { supabase } from '../lib/supabaseClient'
import { supabaseConfigured } from '../lib/env'
import { formatDateTime } from '../lib/utils'
import { phrase } from './assistantPhrases'
import { retrieveKnowledge } from './knowledgeService'
import {
  classifyMoisture,
  isReadingStale,
  latestSoilMoisture,
  loadThresholds,
} from './irrigationService'
import { plantsNeedingAttention, summarizePlant, type PlantHealthSummary } from './plantMonitoringService'

/**
 * AI Assistant Service.
 *
 * One entry point, two interchangeable engines:
 *   1. `backend-ai` — the Supabase Edge Function `ai-assistant`, which holds the
 *      provider API key and (optionally) a RAG index. Used when Supabase is
 *      configured. The browser never sees a provider key.
 *   2. `local-knowledge` — an honest, inspectable retrieval + rules engine used
 *      while no model is connected. It only states what is in the knowledge
 *      entries or in the farmer's own records, and asks for missing context
 *      instead of guessing.
 *
 * Both engines return the same shape, and both mark whether farm records were
 * used, so the UI can say so plainly.
 */

export interface AssistantSource {
  title: string
  sourceName: string
  sourceUrl: string | null
  verificationStatus: VerificationStatus
  language: Language
}

export type AssistantEngine = 'backend-ai' | 'local-knowledge'

export interface AssistantReply {
  text: string
  engine: AssistantEngine
  usedFarmData: boolean
  sources: AssistantSource[]
  followUps: string[]
}

export interface AssistantRequest {
  source: DataSource
  userId: string
  language: Language
  message: string
  hasAttachment: boolean
  plantId?: string | null
  conversationId?: string | null
}

type Intent =
  | 'greeting'
  | 'thanks'
  | 'attention'
  | 'plant_status'
  | 'water'
  | 'yellow_leaves'
  | 'disease'
  | 'soil'
  | 'fertiliser'
  | 'pest'
  | 'weather'
  | 'general'

const INTENT_WORDS: Record<Exclude<Intent, 'general' | 'greeting' | 'thanks'>, string[]> = {
  attention: ['attention', 'attension', 'needs help', 'worried', 'problem plant', 'गमन', 'गमन', 'ಗಮನ', 'ध्यान', 'ಚಿಂತೆ'],
  plant_status: [
    'how is', 'how are', 'doing', 'health', 'update', 'status', 'my plant', 'my tomato', 'healthy',
    'ಸೇಹತ', 'ಆರೋಗ್ಯ', 'स्थिति', 'सेहत', 'स्वास्थ्य',
  ],
  water: ['water', 'watering', 'irrigat', 'moisture', 'dry soil', 'ನೀರು', 'ತೇವ', 'नमी', 'पानी', 'सिंचाई'],
  yellow_leaves: ['yellow', 'pale', 'ಹಳದಿ', 'पीली', 'पीला'],
  disease: ['disease', 'spot', 'spots', 'blight', 'mould', 'mold', 'fungus', 'rot', 'ರೋಗ', 'ಚುಕ್ಕೆ', 'रोग', 'धब्बे'],
  soil: ['soil', 'compost', 'manure', 'ಮಣ್ಣು', 'गोबर', 'मिट्टी', 'खाद'],
  fertiliser: ['fertil', 'nutrient', 'urea', 'dap', 'npk', 'ಗೊಬ್ಬರ', 'ಪೋಷಕ', 'उर्वरक', 'खाद', 'पोषक'],
  pest: ['pest', 'insect', 'bug', 'caterpillar', 'aphid', 'ಕೀಟ', 'ಹುಳು', 'कीट', 'इल्ली'],
  weather: ['weather', 'rain', 'monsoon', 'ಮಳೆ', 'हवामान', 'बारिश', 'मौसम'],
}

function detectIntent(text: string): Intent {
  const value = text.toLowerCase().trim()
  if (!value) return 'general'
  if (/^(hi|hello|hey|namaste|namaskara|नमस्ते|ನಮಸ್ತೆ|ನಮಸ್ಕಾರ)/.test(value)) return 'greeting'
  if (/(thank|thanks|dhanyavada|ಧನ್ಯವಾದ|धन्यवाद)/.test(value)) return 'thanks'
  const scored = Object.entries(INTENT_WORDS)
    .map(([intent, words]) => ({ intent: intent as Intent, hits: words.filter((word) => value.includes(word)).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
  return scored[0]?.intent ?? 'general'
}

interface FarmContext {
  plants: Plant[]
  summaries: PlantHealthSummary[]
  observations: Observation[]
  readings: SensorReading[]
  alerts: AlertRecord[]
}

async function loadFarmContext(source: DataSource, userId: string): Promise<FarmContext> {
  const [plants, observations, readings, alerts] = await Promise.all([
    source.listPlants(userId),
    source.listObservationsForOwner(userId),
    source.listReadingsForOwner(userId, 500),
    source.listAlerts(userId),
  ])
  const summaries = plants.map((plant) => {
    const thresholds = loadThresholds(plant.id)
    return summarizePlant(
      plant,
      observations.filter((observation) => observation.plant_id === plant.id),
      alerts,
      readings,
      thresholds,
    )
  })
  return { plants, summaries, observations, readings, alerts }
}

function bullet(lines: string[]): string {
  return lines.map((line) => `• ${line}`).join('\n')
}

function toSources(retrieved: Awaited<ReturnType<typeof retrieveKnowledge>>): AssistantSource[] {
  return retrieved.map((item) => ({
    title: item.entry.title,
    sourceName: item.entry.source_name,
    sourceUrl: item.entry.source_url,
    verificationStatus: item.entry.verification_status,
    language: item.entry.language,
  }))
}

function knowledgeBlock(retrieved: Awaited<ReturnType<typeof retrieveKnowledge>>, language: Language): string {
  if (retrieved.length === 0) return ''
  const parts = retrieved.map((item) => {
    const note =
      item.englishFallback && language !== 'en'
        ? ' (English only — this entry has no translation yet)'
        : ''
    return `— ${item.entry.title}${note}\n${item.entry.content}`
  })
  return parts.join('\n\n')
}

function describePlant(plant: Plant, summary: PlantHealthSummary, language: Language): string {
  const last = summary.lastObservation
  const lastText = last
    ? `${formatDateTime(last.observation_date, language)}${last.symptoms ? ` — ${last.symptoms}` : ' — no symptoms recorded'}`
    : 'no observations yet'
  return `${plant.plant_name} (${plant.crop_type}${plant.variety ? `, ${plant.variety}` : ''}): last observation ${lastText}`
}

/** The honest local engine used until a backend model is configured. */
async function localEngine(request: AssistantRequest, context: FarmContext): Promise<AssistantReply> {
  const { message, language } = request
  const intent = detectIntent(message)
  const parts: string[] = []
  const followUps: string[] = []
  let usedFarmData = false
  let retrieved = await retrieveKnowledge(request.source, message, language, { limit: 2 })

  const relevantPlants = request.plantId
    ? context.summaries.filter((summary) => summary.plant.id === request.plantId)
    : []

  switch (intent) {
    case 'greeting': {
      parts.push(phrase(language, 'greeting'))
      if (context.plants.length > 0) {
        parts.push(`You are following ${context.plants.length} plant${context.plants.length === 1 ? '' : 's'} in CropSentinel.`)
        usedFarmData = true
      }
      followUps.push(
        language === 'en' ? 'Which crop should we talk about?' : language === 'kn' ? 'ಯಾವ ಬೆಳೆ ಬಗ್ಗೆ ಮಾತನಾಡೋಣ?' : 'किस फसल पर बात करें?',
      )
      break
    }
    case 'thanks': {
      parts.push(phrase(language, 'thanks'))
      break
    }
    case 'attention': {
      const needing = plantsNeedingAttention(context.summaries)
      if (context.plants.length === 0) {
        parts.push(phrase(language, 'noPlants'))
      } else if (needing.length === 0) {
        parts.push(phrase(language, 'noneNeedAttention'))
        usedFarmData = true
      } else {
        usedFarmData = true
        parts.push(phrase(language, 'attentionHeader'))
        parts.push(
          bullet(
            needing.map(
              (summary) => `${summary.plant.plant_name} — ${summary.reasons[0] ?? 'needs a check'}`,
            ),
          ),
        )
      }
      break
    }
    case 'plant_status': {
      if (relevantPlants.length > 0) {
        usedFarmData = true
        const summary = relevantPlants[0]
        parts.push(`${summary.plant.plant_name}: ${summary.reasons.join(' ')}`)
        if (summary.lastObservation) {
          parts.push(`Last observation: ${formatDateTime(summary.lastObservation.observation_date, language)}.`)
        }
      } else if (context.plants.length === 0) {
        parts.push(phrase(language, 'noPlants'))
      } else {
        usedFarmData = true
        parts.push(phrase(language, 'plantHeader'))
        parts.push(
          bullet(
            context.summaries.map((summary) => {
              const status =
                summary.level === 'attention'
                  ? 'needs attention'
                  : summary.level === 'watch'
                    ? 'worth checking'
                    : summary.level === 'unknown'
                      ? 'no data yet'
                      : 'no problems recorded'
              return `${describePlant(summary.plant, summary, language)} — ${status}`
            }),
          ),
        )
      }
      break
    }
    case 'water': {
      const target = relevantPlants[0] ?? context.summaries[0]
      if (target) {
        usedFarmData = true
        const thresholds = loadThresholds(target.plant.id)
        const reading = latestSoilMoisture(
          context.readings.filter((item) => item.plant_id === target.plant.id),
        )
        if (reading) {
          const status = classifyMoisture(reading.reading_value, thresholds)
          parts.push(
            phrase(language, isReadingStale(reading) ? 'sensorStale' : 'sensorReading', {
              plant: target.plant.plant_name,
              value: reading.reading_value,
              unit: reading.unit,
              time: formatDateTime(reading.recorded_at, language),
              status,
            }),
          )
        } else {
          parts.push(phrase(language, 'noSensor'))
        }
      } else {
        parts.push(phrase(language, 'noSensor'))
      }
      if (!retrieved.some((item) => item.entry.topic === 'Irrigation')) {
        retrieved = retrieved.concat(
          await retrieveKnowledge(request.source, 'when to irrigate soil moisture', language, { limit: 1 }),
        )
      }
      followUps.push(phrase(language, 'askCrop'))
      break
    }
    case 'yellow_leaves': {
      parts.push(phrase(language, 'askWhere'))
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'yellow leaves chlorosis', language, { limit: 2 })
      }
      parts.push(phrase(language, 'askPhoto'))
      parts.push(phrase(language, 'attachmentNotAnalysed'))
      followUps.push(phrase(language, 'askCrop'))
      break
    }
    case 'disease': {
      parts.push(
        'I can describe what is usually checked for this, but I will not name a disease without evidence. A photo and a description of the pattern are needed first.',
      )
      if (request.hasAttachment) {
        parts.push(phrase(language, 'attachmentNotAnalysed'))
      } else {
        parts.push(phrase(language, 'askPhoto'))
      }
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'leaf spots disease', language, { limit: 2 })
      }
      parts.push(phrase(language, 'expert'))
      break
    }
    case 'soil': {
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'soil health compost organic matter', language, { limit: 2 })
      }
      parts.push(phrase(language, 'soilTest'))
      break
    }
    case 'fertiliser': {
      parts.push(phrase(language, 'noDose'))
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'soil nutrients deficiency', language, { limit: 1 })
      }
      break
    }
    case 'pest': {
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'pest scouting insects', language, { limit: 2 })
      }
      parts.push(phrase(language, 'noDose'))
      break
    }
    case 'weather': {
      parts.push(phrase(language, 'weatherNotConnected'))
      if (retrieved.length === 0) {
        retrieved = await retrieveKnowledge(request.source, 'weather spraying rain', language, { limit: 1 })
      }
      break
    }
    default: {
      if (retrieved.length > 0) {
        parts.push(phrase(language, 'fallback'))
      } else {
        parts.push(phrase(language, 'fallbackNoResult'))
      }
      followUps.push(phrase(language, 'askCrop'))
      break
    }
  }

  const knowledge = knowledgeBlock(retrieved, language)
  if (knowledge) parts.push(knowledge)
  if (retrieved.length > 0) parts.push(phrase(language, 'generalAdvice'))
  if (request.hasAttachment) parts.push(phrase(language, 'attachmentNotAnalysed'))

  return {
    text: parts.filter(Boolean).join('\n\n'),
    engine: 'local-knowledge',
    usedFarmData,
    sources: toSources(retrieved),
    followUps,
  }
}

/** Call the protected backend AI function. */
async function backendEngine(request: AssistantRequest): Promise<AssistantReply> {
  if (!supabase) throw new Error('The AI backend is not configured.')
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message: request.message,
      language: request.language,
      conversation_id: request.conversationId ?? null,
      plant_id: request.plantId ?? null,
      has_attachment: request.hasAttachment,
    },
  })
  if (error) {
    throw new Error(
      `The AI service could not be reached (${error.message}). The function must be deployed and its provider key set as a Supabase secret.`,
    )
  }
  const payload = data as {
    text?: string
    sources?: Array<{ title: string; source_name: string; source_url: string | null; verification_status: VerificationStatus; language: Language }>
    used_farm_data?: boolean
    follow_ups?: string[]
  } | null
  if (!payload?.text) {
    throw new Error('The AI service returned an empty answer.')
  }
  return {
    text: payload.text,
    engine: 'backend-ai',
    usedFarmData: Boolean(payload.used_farm_data),
    sources: (payload.sources ?? []).map((source) => ({
      title: source.title,
      sourceName: source.source_name,
      sourceUrl: source.source_url,
      verificationStatus: source.verification_status,
      language: source.language,
    })),
    followUps: payload.follow_ups ?? [],
  }
}

export async function generateAssistantReply(request: AssistantRequest): Promise<AssistantReply> {
  if (supabaseConfigured) {
    return backendEngine(request)
  }
  const context = await loadFarmContext(request.source, request.userId)
  return localEngine(request, context)
}

export { loadFarmContext }
