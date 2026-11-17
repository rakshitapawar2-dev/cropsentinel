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
  UserRole,
} from '../types/database'
import { nowIso, newId } from '../lib/utils'
import { assertUsableImage } from '../lib/imageFile'
import { sampleKnowledge } from './sampleKnowledge'
import type { DataSource, KnowledgeFilter } from './dataSource'

/**
 * Local demo data source.
 *
 * Used only when Supabase credentials are not configured. It keeps records in
 * this browser's localStorage so every screen, form and upload flow really
 * works before a backend exists. The UI always shows a "local demo" banner so
 * nobody mistakes these records for synced farm data.
 */

const STORAGE_KEY = 'cropsentinel.demo.v1'
export const DEMO_USER_ID = 'demo-farmer'

interface LocalDb {
  profile: Profile
  farms: Farm[]
  plants: Plant[]
  observations: Observation[]
  conversations: Conversation[]
  messages: Message[]
  sensor_readings: SensorReading[]
  irrigation_events: IrrigationEvent[]
  alerts: AlertRecord[]
  agricultural_knowledge: AgriculturalKnowledge[]
}

function emptyDb(): LocalDb {
  const createdAt = nowIso()
  return {
    profile: {
      id: DEMO_USER_ID,
      full_name: 'Demo farmer',
      preferred_language: 'en',
      phone_number: null,
      location: null,
      role: 'admin' as UserRole,
      created_at: createdAt,
    },
    farms: [],
    plants: [],
    observations: [],
    conversations: [],
    messages: [],
    sensor_readings: [],
    irrigation_events: [],
    alerts: [],
    agricultural_knowledge: sampleKnowledge.map((entry) => ({ ...entry, created_at: createdAt })),
  }
}

function load(): LocalDb {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    const parsed = JSON.parse(raw) as Partial<LocalDb>
    const base = emptyDb()
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      agricultural_knowledge:
        parsed.agricultural_knowledge && parsed.agricultural_knowledge.length > 0
          ? parsed.agricultural_knowledge
          : base.agricultural_knowledge,
    }
  } catch {
    return emptyDb()
  }
}

function persist(db: LocalDb): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    throw new Error(
      'This browser could not store the change (storage is full). Delete some saved photos or connect Supabase.',
    )
  }
}

/** Resize + compress an image before storing it as a data URL. */
async function compressImage(file: File, maxSize = 1000): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not read that image file.'))
      element.src = bitmapUrl
    })
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not process that image file.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}

export class LocalSource implements DataSource {
  mode = 'local' as const

  private plantIdsForOwner(db: LocalDb, ownerId: string): string[] {
    const farmIds = db.farms.filter((farm) => farm.owner_id === ownerId).map((farm) => farm.id)
    return db.plants.filter((plant) => farmIds.includes(plant.farm_id)).map((plant) => plant.id)
  }

  async getProfile(id: string): Promise<Profile | null> {
    const db = load()
    return db.profile.id === id ? db.profile : null
  }

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const db = load()
    db.profile = { ...db.profile, ...profile, id: db.profile.id }
    persist(db)
    return db.profile
  }

  async listFarms(ownerId: string): Promise<Farm[]> {
    return load().farms.filter((farm) => farm.owner_id === ownerId)
  }

  async createFarm(farm: NewFarm): Promise<Farm> {
    const db = load()
    const record: Farm = { ...farm, id: newId('farm'), created_at: nowIso() }
    db.farms.push(record)
    persist(db)
    return record
  }

  async deleteFarm(id: string): Promise<void> {
    const db = load()
    const plantIds = db.plants.filter((plant) => plant.farm_id === id).map((plant) => plant.id)
    db.farms = db.farms.filter((farm) => farm.id !== id)
    db.plants = db.plants.filter((plant) => plant.farm_id !== id)
    db.observations = db.observations.filter((item) => !plantIds.includes(item.plant_id))
    db.alerts = db.alerts.filter((item) => !plantIds.includes(item.plant_id))
    db.sensor_readings = db.sensor_readings.filter((item) => !plantIds.includes(item.plant_id))
    db.irrigation_events = db.irrigation_events.filter((item) => !plantIds.includes(item.plant_id))
    persist(db)
  }

  async listPlants(ownerId: string): Promise<Plant[]> {
    const db = load()
    const plantIds = this.plantIdsForOwner(db, ownerId)
    return db.plants.filter((plant) => plantIds.includes(plant.id))
  }

  async createPlant(plant: NewPlant): Promise<Plant> {
    const db = load()
    const record: Plant = { ...plant, id: newId('plant'), created_at: nowIso() }
    db.plants.push(record)
    persist(db)
    return record
  }

  async deletePlant(id: string): Promise<void> {
    const db = load()
    db.plants = db.plants.filter((plant) => plant.id !== id)
    db.observations = db.observations.filter((item) => item.plant_id !== id)
    db.alerts = db.alerts.filter((item) => item.plant_id !== id)
    db.sensor_readings = db.sensor_readings.filter((item) => item.plant_id !== id)
    db.irrigation_events = db.irrigation_events.filter((item) => item.plant_id !== id)
    persist(db)
  }

  async listObservationsForOwner(ownerId: string): Promise<Observation[]> {
    const db = load()
    const plantIds = this.plantIdsForOwner(db, ownerId)
    return db.observations.filter((item) => plantIds.includes(item.plant_id))
  }

  async createObservation(observation: NewObservation): Promise<Observation> {
    const db = load()
    const record: Observation = { ...observation, id: newId('obs'), created_at: nowIso() }
    db.observations.push(record)
    persist(db)
    return record
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return load()
      .conversations.filter((item) => item.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

  async createConversation(userId: string, title: string, language: Language): Promise<Conversation> {
    const db = load()
    const createdAt = nowIso()
    const record: Conversation = {
      id: newId('conv'),
      user_id: userId,
      title,
      language,
      created_at: createdAt,
      updated_at: createdAt,
    }
    db.conversations.push(record)
    persist(db)
    return record
  }

  async updateConversation(id: string, patch: Partial<Conversation>): Promise<void> {
    const db = load()
    const index = db.conversations.findIndex((item) => item.id === id)
    if (index < 0) return
    db.conversations[index] = { ...db.conversations[index], ...patch, id, updated_at: nowIso() }
    persist(db)
  }

  async deleteConversation(id: string): Promise<void> {
    const db = load()
    db.conversations = db.conversations.filter((item) => item.id !== id)
    db.messages = db.messages.filter((item) => item.conversation_id !== id)
    persist(db)
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return load()
      .messages.filter((item) => item.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  async addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const db = load()
    const record: Message = { ...message, id: newId('msg'), created_at: nowIso() }
    db.messages.push(record)
    const conversation = db.conversations.find((item) => item.id === message.conversation_id)
    if (conversation) conversation.updated_at = record.created_at
    persist(db)
    return record
  }

  async listReadingsForOwner(ownerId: string, limit = 200): Promise<SensorReading[]> {
    const db = load()
    const plantIds = this.plantIdsForOwner(db, ownerId)
    return db.sensor_readings
      .filter((item) => plantIds.includes(item.plant_id))
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .slice(-limit)
  }

  async listIrrigationEventsForOwner(ownerId: string): Promise<IrrigationEvent[]> {
    const db = load()
    const plantIds = this.plantIdsForOwner(db, ownerId)
    return db.irrigation_events
      .filter((item) => plantIds.includes(item.plant_id))
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
  }

  async listAlerts(ownerId: string): Promise<AlertRecord[]> {
    const db = load()
    const plantIds = this.plantIdsForOwner(db, ownerId)
    return db.alerts
      .filter((item) => plantIds.includes(item.plant_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  async createAlert(alert: NewAlert): Promise<AlertRecord> {
    const db = load()
    const record: AlertRecord = { ...alert, id: newId('alert'), created_at: nowIso() }
    db.alerts.push(record)
    persist(db)
    return record
  }

  async updateAlertStatus(id: string, status: AlertStatus): Promise<void> {
    const db = load()
    const alert = db.alerts.find((item) => item.id === id)
    if (alert) alert.status = status
    persist(db)
  }

  async listKnowledge(filter: KnowledgeFilter = {}): Promise<AgriculturalKnowledge[]> {
    const db = load()
    const search = filter.search?.toLowerCase().trim()
    return db.agricultural_knowledge.filter((entry) => {
      if (filter.language && entry.language !== filter.language) return false
      if (filter.topic && entry.topic !== filter.topic) return false
      if (filter.cropType && entry.crop_type && entry.crop_type !== filter.cropType) return false
      if (search) {
        const haystack = `${entry.title} ${entry.content} ${entry.topic}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }

  async createKnowledge(entry: NewKnowledge): Promise<AgriculturalKnowledge> {
    const db = load()
    const record: AgriculturalKnowledge = { ...entry, id: newId('know'), created_at: nowIso() }
    db.agricultural_knowledge.push(record)
    persist(db)
    return record
  }

  async updateKnowledge(id: string, patch: Partial<AgriculturalKnowledge>): Promise<void> {
    const db = load()
    const index = db.agricultural_knowledge.findIndex((entry) => entry.id === id)
    if (index < 0) throw new Error('Knowledge entry not found')
    db.agricultural_knowledge[index] = { ...db.agricultural_knowledge[index], ...patch, id }
    persist(db)
  }

  async deleteKnowledge(id: string): Promise<void> {
    const db = load()
    db.agricultural_knowledge = db.agricultural_knowledge.filter((entry) => entry.id !== id)
    persist(db)
  }

  async uploadCropImage(file: File, ownerId: string): Promise<string> {
    assertUsableImage(file)
    // The owner id is not part of a browser-only data URL.
    void ownerId
    return compressImage(file)
  }

  /** Demo helper: adds clearly-labelled sample records for exploring the UI. */
  async loadSampleFarm(ownerId: string): Promise<void> {
    const db = load()
    const createdAt = nowIso()
    const farm: Farm = {
      id: newId('farm'),
      owner_id: ownerId,
      farm_name: 'Sample farm (demo)',
      location: 'Sample village',
      farm_size: '0.5 acre',
      created_at: createdAt,
    }
    const plants: Plant[] = [
      {
        id: newId('plant'),
        farm_id: farm.id,
        plant_name: 'Sample — Tomato bed A',
        crop_type: 'Tomato',
        variety: 'Local variety',
        planting_date: new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10),
        growth_stage: 'Flowering',
        location_label: 'North side',
        notes: 'Sample record created from the demo button. Not real farm data.',
        created_at: createdAt,
      },
      {
        id: newId('plant'),
        farm_id: farm.id,
        plant_name: 'Sample — Chilli row B',
        crop_type: 'Chilli',
        variety: null,
        planting_date: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10),
        growth_stage: 'Vegetative',
        location_label: 'Near the well',
        notes: 'Sample record created from the demo button. Not real farm data.',
        created_at: createdAt,
      },
    ]
    db.farms.push(farm)
    db.plants.push(...plants)
    persist(db)
  }

  /** Demo helper: clear locally stored demo records. */
  async resetDemoData(): Promise<void> {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
