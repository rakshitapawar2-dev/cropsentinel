import { supabaseConfigured } from '../lib/env'
import { LocalSource } from './localSource'
import { SupabaseSource } from './supabaseSource'
import type { DataSource } from './dataSource'

/**
 * The one place that decides where records live.
 * Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to switch to PostgreSQL.
 * Screens and services only ever see the `DataSource` interface.
 */
export const localSource = new LocalSource()

export const dataSource: DataSource = supabaseConfigured ? new SupabaseSource() : localSource

export const isDemoMode = !supabaseConfigured
export type { DataSource } from './dataSource'
