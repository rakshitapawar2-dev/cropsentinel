/**
 * CropSentinel domain types.
 * These mirror the PostgreSQL schema in `supabase/migrations/0001_initial_schema.sql`
 * so the local demo data source and the Supabase data source stay interchangeable.
 */

export type Language = 'en' | 'kn' | 'hi'

export type UserRole = 'farmer' | 'admin'

export type AnalysisStatus = 'pending' | 'completed' | 'failed' | 'model_unavailable'

export type Sender = 'farmer' | 'assistant' | 'system'

export type SensorType = 'soil_moisture' | 'soil_temperature' | 'air_temperature' | 'humidity'

export type PumpStatus = 'on' | 'off' | 'unknown'

export type IrrigationEventType = 'pump_run' | 'manual_watering' | 'reading'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export type VerificationStatus = 'sample' | 'unverified' | 'verified'

export type MoistureStatus = 'dry' | 'moderate' | 'moist' | 'unknown'

export interface Profile {
  id: string
  full_name: string
  preferred_language: Language
  phone_number: string | null
  location: string | null
  role: UserRole
  created_at: string
}

export interface Farm {
  id: string
  owner_id: string
  farm_name: string
  location: string | null
  farm_size: string | null
  created_at: string
}

export interface Plant {
  id: string
  farm_id: string
  plant_name: string
  crop_type: string
  variety: string | null
  planting_date: string | null
  growth_stage: string | null
  location_label: string | null
  notes: string | null
  created_at: string
}

export interface Observation {
  id: string
  plant_id: string
  observation_date: string
  image_url: string | null
  symptoms: string | null
  soil_condition: string | null
  analysis_status: AnalysisStatus
  analysis_result: string | null
  confidence_score: number | null
  farmer_notes: string | null
  follow_up_status: string | null
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  language: Language
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender: Sender
  message_text: string
  attachment_url: string | null
  created_at: string
}

export interface SensorReading {
  id: string
  plant_id: string
  sensor_type: SensorType
  reading_value: number
  unit: string
  recorded_at: string
  source: string
}

export interface IrrigationEvent {
  id: string
  plant_id: string
  moisture_before: number | null
  moisture_after: number | null
  pump_status: PumpStatus
  event_type: IrrigationEventType
  started_at: string
  ended_at: string | null
}

export interface AlertRecord {
  id: string
  plant_id: string
  alert_type: string
  title: string
  description: string
  severity: AlertSeverity
  status: AlertStatus
  created_at: string
}

export interface AgriculturalKnowledge {
  id: string
  title: string
  topic: string
  crop_type: string | null
  language: Language
  content: string
  source_name: string
  source_url: string | null
  verification_status: VerificationStatus
  last_reviewed: string | null
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  conversation_id: string | null
  message_id: string | null
  rating: number
  feedback_text: string | null
  created_at: string
}

/** A plant together with optional joined farm information, used by the UI. */
export interface PlantWithFarm extends Plant {
  farm_name?: string
}

export type NewPlant = Omit<Plant, 'id' | 'created_at'>
export type NewObservation = Omit<Observation, 'id' | 'created_at'>
export type NewFarm = Omit<Farm, 'id' | 'created_at'>
export type NewSensorReading = Omit<SensorReading, 'id' | 'recorded_at'> & { recorded_at?: string }
export type NewIrrigationEvent = Omit<IrrigationEvent, 'id'>
export type NewAlert = Omit<AlertRecord, 'id' | 'created_at'>
export type NewKnowledge = Omit<AgriculturalKnowledge, 'id' | 'created_at'>
