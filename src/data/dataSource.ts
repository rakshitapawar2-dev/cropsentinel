import type {
  AgriculturalKnowledge,
  AlertRecord,
  AlertStatus,
  Conversation,
  Farm,
  IrrigationEvent,
  Language,
  Message,
  NewAlert,
  NewFarm,
  NewKnowledge,
  NewObservation,
  NewPlant,
  Observation,
  Plant,
  Profile,
  SensorReading,
} from '../types/database'

export type DataMode = 'supabase' | 'local'

export interface KnowledgeFilter {
  language?: Language
  topic?: string
  cropType?: string | null
  search?: string
}

/**
 * Every screen talks to this interface, never to Supabase (or localStorage)
 * directly. `supabaseSource` implements it against PostgreSQL + RLS;
 * `localSource` implements it in-browser so the app is usable before a
 * Supabase project is connected. Swapping the backend never touches the UI.
 */
export interface DataSource {
  mode: DataMode

  getProfile(id: string): Promise<Profile | null>
  upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile>

  listFarms(ownerId: string): Promise<Farm[]>
  createFarm(farm: NewFarm): Promise<Farm>
  deleteFarm(id: string): Promise<void>

  listPlants(ownerId: string): Promise<Plant[]>
  createPlant(plant: NewPlant): Promise<Plant>
  deletePlant(id: string): Promise<void>

  listObservationsForOwner(ownerId: string): Promise<Observation[]>
  createObservation(observation: NewObservation): Promise<Observation>

  listConversations(userId: string): Promise<Conversation[]>
  createConversation(userId: string, title: string, language: Language): Promise<Conversation>
  updateConversation(id: string, patch: Partial<Conversation>): Promise<void>
  deleteConversation(id: string): Promise<void>
  listMessages(conversationId: string): Promise<Message[]>
  addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message>

  // Read-only for farmers: readings and irrigation events are written by the
  // authenticated sensor-ingest function, never from the browser.
  listReadingsForOwner(ownerId: string, limit?: number): Promise<SensorReading[]>
  listIrrigationEventsForOwner(ownerId: string): Promise<IrrigationEvent[]>

  listAlerts(ownerId: string): Promise<AlertRecord[]>
  createAlert(alert: NewAlert): Promise<AlertRecord>
  updateAlertStatus(id: string, status: AlertStatus): Promise<void>

  listKnowledge(filter?: KnowledgeFilter): Promise<AgriculturalKnowledge[]>
  createKnowledge(entry: NewKnowledge): Promise<AgriculturalKnowledge>
  updateKnowledge(id: string, patch: Partial<AgriculturalKnowledge>): Promise<void>
  deleteKnowledge(id: string): Promise<void>

  uploadCropImage(file: File, ownerId: string): Promise<string>
}
