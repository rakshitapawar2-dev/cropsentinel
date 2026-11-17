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
import { env } from '../lib/env'
import { fileExtension, nowIso } from '../lib/utils'
import { assertUsableImage } from '../lib/imageFile'
import { supabase } from '../lib/supabaseClient'
import type { DataSource, KnowledgeFilter } from './dataSource'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`)
}

/**
 * Supabase (PostgreSQL + RLS) implementation of the data source.
 * Every query relies on Row Level Security for authorization: the browser
 * never sends an owner filter that could be trusted anyway.
 */
export class SupabaseSource implements DataSource {
  mode = 'supabase' as const

  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await client().from('profiles').select('*').eq('id', id).maybeSingle()
    if (error) fail('Could not load profile', error)
    return (data as Profile | null) ?? null
  }

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const { data, error } = await client()
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) fail('Could not save profile', error)
    return data as Profile
  }

  async listFarms(ownerId: string): Promise<Farm[]> {
    const { data, error } = await client()
      .from('farms')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })
    if (error) fail('Could not load farms', error)
    return (data ?? []) as Farm[]
  }

  async createFarm(farm: NewFarm): Promise<Farm> {
    const { data, error } = await client().from('farms').insert(farm).select('*').single()
    if (error) fail('Could not create farm', error)
    return data as Farm
  }

  async deleteFarm(id: string): Promise<void> {
    const { error } = await client().from('farms').delete().eq('id', id)
    if (error) fail('Could not delete farm', error)
  }

  private async plantIdsForOwner(ownerId: string): Promise<string[]> {
    const farms = await this.listFarms(ownerId)
    if (farms.length === 0) return []
    const { data, error } = await client()
      .from('plants')
      .select('id')
      .in(
        'farm_id',
        farms.map((farm) => farm.id),
      )
    if (error) fail('Could not load plants', error)
    return (data ?? []).map((row) => (row as { id: string }).id)
  }

  async listPlants(ownerId: string): Promise<Plant[]> {
    const farms = await this.listFarms(ownerId)
    if (farms.length === 0) return []
    const { data, error } = await client()
      .from('plants')
      .select('*')
      .in(
        'farm_id',
        farms.map((farm) => farm.id),
      )
      .order('created_at', { ascending: true })
    if (error) fail('Could not load plants', error)
    return (data ?? []) as Plant[]
  }

  async createPlant(plant: NewPlant): Promise<Plant> {
    const { data, error } = await client().from('plants').insert(plant).select('*').single()
    if (error) fail('Could not create plant', error)
    return data as Plant
  }

  async deletePlant(id: string): Promise<void> {
    const { error } = await client().from('plants').delete().eq('id', id)
    if (error) fail('Could not delete plant', error)
  }

  async listObservationsForOwner(ownerId: string): Promise<Observation[]> {
    const plantIds = await this.plantIdsForOwner(ownerId)
    if (plantIds.length === 0) return []
    const { data, error } = await client()
      .from('observations')
      .select('*')
      .in('plant_id', plantIds)
      .order('observation_date', { ascending: false })
    if (error) fail('Could not load observations', error)
    return (data ?? []) as Observation[]
  }

  async createObservation(observation: NewObservation): Promise<Observation> {
    const { data, error } = await client().from('observations').insert(observation).select('*').single()
    if (error) fail('Could not save observation', error)
    return data as Observation
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await client()
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) fail('Could not load conversations', error)
    return (data ?? []) as Conversation[]
  }

  async createConversation(userId: string, title: string, language: Language): Promise<Conversation> {
    const { data, error } = await client()
      .from('conversations')
      .insert({ user_id: userId, title, language })
      .select('*')
      .single()
    if (error) fail('Could not start a conversation', error)
    return data as Conversation
  }

  async updateConversation(id: string, patch: Partial<Conversation>): Promise<void> {
    const { error } = await client()
      .from('conversations')
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
    if (error) fail('Could not update conversation', error)
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await client().from('conversations').delete().eq('id', id)
    if (error) fail('Could not delete conversation', error)
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await client()
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) fail('Could not load messages', error)
    return (data ?? []) as Message[]
  }

  async addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const { data, error } = await client().from('messages').insert(message).select('*').single()
    if (error) fail('Could not save message', error)
    return data as Message
  }

  async listReadingsForOwner(ownerId: string, limit = 200): Promise<SensorReading[]> {
    const plantIds = await this.plantIdsForOwner(ownerId)
    if (plantIds.length === 0) return []
    const { data, error } = await client()
      .from('sensor_readings')
      .select('*')
      .in('plant_id', plantIds)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) fail('Could not load sensor readings', error)
    return (data ?? []) as SensorReading[]
  }

  async listIrrigationEventsForOwner(ownerId: string): Promise<IrrigationEvent[]> {
    const plantIds = await this.plantIdsForOwner(ownerId)
    if (plantIds.length === 0) return []
    const { data, error } = await client()
      .from('irrigation_events')
      .select('*')
      .in('plant_id', plantIds)
      .order('started_at', { ascending: false })
    if (error) fail('Could not load irrigation history', error)
    return (data ?? []) as IrrigationEvent[]
  }

  async listAlerts(ownerId: string): Promise<AlertRecord[]> {
    const plantIds = await this.plantIdsForOwner(ownerId)
    if (plantIds.length === 0) return []
    const { data, error } = await client()
      .from('alerts')
      .select('*')
      .in('plant_id', plantIds)
      .order('created_at', { ascending: false })
    if (error) fail('Could not load alerts', error)
    return (data ?? []) as AlertRecord[]
  }

  async createAlert(alert: NewAlert): Promise<AlertRecord> {
    const { data, error } = await client().from('alerts').insert(alert).select('*').single()
    if (error) fail('Could not create alert', error)
    return data as AlertRecord
  }

  async updateAlertStatus(id: string, status: AlertStatus): Promise<void> {
    const { error } = await client().from('alerts').update({ status }).eq('id', id)
    if (error) fail('Could not update alert', error)
  }

  async listKnowledge(filter: KnowledgeFilter = {}): Promise<AgriculturalKnowledge[]> {
    let query = client().from('agricultural_knowledge').select('*')
    if (filter.language) query = query.eq('language', filter.language)
    if (filter.topic) query = query.eq('topic', filter.topic)
    if (filter.search) query = query.ilike('title', `%${filter.search}%`)
    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) fail('Could not load knowledge entries', error)
    return (data ?? []) as AgriculturalKnowledge[]
  }

  async createKnowledge(entry: NewKnowledge): Promise<AgriculturalKnowledge> {
    const { data, error } = await client()
      .from('agricultural_knowledge')
      .insert(entry)
      .select('*')
      .single()
    if (error) fail('Could not create knowledge entry', error)
    return data as AgriculturalKnowledge
  }

  async updateKnowledge(id: string, patch: Partial<AgriculturalKnowledge>): Promise<void> {
    const { error } = await client().from('agricultural_knowledge').update(patch).eq('id', id)
    if (error) fail('Could not update knowledge entry', error)
  }

  async deleteKnowledge(id: string): Promise<void> {
    const { error } = await client().from('agricultural_knowledge').delete().eq('id', id)
    if (error) fail('Could not delete knowledge entry', error)
  }

  async uploadCropImage(file: File, ownerId: string): Promise<string> {
    assertUsableImage(file)
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension(file.name)}`
    const { error } = await client()
      .storage.from(env.storageBucket)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) fail('Could not upload the image', error)
    const { data } = client().storage.from(env.storageBucket).getPublicUrl(path)
    return data.publicUrl
  }
}
