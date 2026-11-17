import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { Logo } from './components/layout/Logo'
import { supabaseConfigured } from './lib/env'
import { useAppData } from './providers/AppDataProvider'
import AdminPage from './pages/AdminPage'
import AlertsPage from './pages/AlertsPage'
import AssistantPage from './pages/AssistantPage'
import AuthPage from './pages/AuthPage'
import CropClinicPage from './pages/CropClinicPage'
import FarmPage from './pages/FarmPage'
import IrrigationPage from './pages/IrrigationPage'
import PlantDetailPage from './pages/PlantDetailPage'
import PlantsPage from './pages/PlantsPage'
import ProfilePage from './pages/ProfilePage'

function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-cream">
      <Logo />
      <span className="flex items-center gap-2 text-sm text-forest-700" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your farm…
      </span>
    </div>
  )
}

export default function App() {
  const { ready, userId } = useAppData()

  if (!ready) return <Splash />
  if (supabaseConfigured && !userId) return <AuthPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<AssistantPage />} />
        <Route path="/farm" element={<FarmPage />} />
        <Route path="/plants" element={<PlantsPage />} />
        <Route path="/plants/:plantId" element={<PlantDetailPage />} />
        <Route path="/clinic" element={<CropClinicPage />} />
        <Route path="/irrigation" element={<IrrigationPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
