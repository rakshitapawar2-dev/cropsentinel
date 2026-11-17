import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AlertRecord,
  Farm,
  Observation,
  Plant,
  Profile,
  SensorReading,
} from '../types/database'
import { dataSource, isDemoMode, localSource } from '../data'
import { DEMO_USER_ID } from '../data/localSource'
import { supabase } from '../lib/supabaseClient'
import { supabaseConfigured } from '../lib/env'
import { loadThresholds } from '../services/irrigationService'
import { summarizePlant, type PlantHealthSummary } from '../services/plantMonitoringService'
import { syncAlerts } from '../services/alertService'

interface AppDataValue {
  ready: boolean
  error: string | null
  userId: string | null
  profile: Profile | null
  farms: Farm[]
  plants: Plant[]
  observations: Observation[]
  readings: SensorReading[]
  alerts: AlertRecord[]
  summaries: PlantHealthSummary[]
  isAdmin: boolean
  demoMode: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  resetDemoData: () => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [alerts, setAlerts] = useState<AlertRecord[]>([])

  /** Auth: Supabase session when configured, otherwise the local demo farmer. */
  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setUserId(DEMO_USER_ID)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUserId(data.session?.user.id ?? null)
      if (!data.session) setReady(true)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) {
      setReady(true)
      return
    }
    try {
      setError(null)
      let nextProfile = await dataSource.getProfile(userId)
      if (!nextProfile && userId === DEMO_USER_ID) {
        nextProfile = await dataSource.upsertProfile({
          id: DEMO_USER_ID,
          full_name: 'Demo farmer',
          preferred_language: 'en',
          role: 'admin',
        })
      }
      const [nextFarms, nextPlants] = await Promise.all([
        dataSource.listFarms(userId),
        dataSource.listPlants(userId),
      ])
      const [nextObservations, nextReadings, nextAlerts] = await Promise.all([
        dataSource.listObservationsForOwner(userId),
        dataSource.listReadingsForOwner(userId, 500),
        dataSource.listAlerts(userId),
      ])
      setProfileState(nextProfile)
      setFarms(nextFarms)
      setPlants(nextPlants)
      setObservations(nextObservations)
      setReadings(nextReadings)
      if (nextPlants.length > 0) {
        const synced = await syncAlerts(dataSource, userId)
        setAlerts(synced)
      } else {
        setAlerts(nextAlerts)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your records.')
    } finally {
      setReady(true)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const summaries = useMemo(
    () =>
      plants.map((plant) =>
        summarizePlant(
          plant,
          observations.filter((observation) => observation.plant_id === plant.id),
          alerts,
          readings,
          loadThresholds(plant.id),
        ),
      ),
    [plants, observations, alerts, readings],
  )

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUserId(supabaseConfigured ? null : DEMO_USER_ID)
    setProfileState(null)
    setFarms([])
    setPlants([])
    setObservations([])
    setReadings([])
    setAlerts([])
  }, [])

  const resetDemoData = useCallback(async () => {
    if (!isDemoMode) return
    await localSource.resetDemoData()
    setReady(false)
    await refresh()
  }, [refresh])

  const value: AppDataValue = {
    ready,
    error,
    userId,
    profile,
    farms,
    plants,
    observations,
    readings,
    alerts,
    summaries,
    isAdmin: profile?.role === 'admin',
    demoMode: isDemoMode,
    refresh,
    signOut,
    resetDemoData,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside <AppDataProvider>')
  return context
}
