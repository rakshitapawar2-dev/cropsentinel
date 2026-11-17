import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BellRing,
  Camera,
  Database,
  Droplets,
  Info,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sprout,
  UserRound,
  Warehouse,
  X,
} from 'lucide-react'
import { Logo } from './Logo'
import { LanguageSelect } from './LanguageSelect'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useAppData } from '../../providers/AppDataProvider'
import { cn, initials } from '../../lib/utils'
import { integrationStatus } from '../../lib/env'

export function AppShell() {
  const { t } = useLanguage()
  const { profile, userId, isAdmin, demoMode, alerts, plants, error, signOut } = useAppData()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const openAlerts = alerts.filter((alert) => alert.status !== 'resolved').length

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const items = [
    { to: '/', label: t('nav.assistant'), icon: MessageSquareText, end: true },
    { to: '/farm', label: t('nav.farm'), icon: Warehouse },
    { to: '/plants', label: t('nav.plants'), icon: Sprout, badge: plants.length || undefined },
    { to: '/clinic', label: t('nav.clinic'), icon: Camera },
    { to: '/irrigation', label: t('nav.irrigation'), icon: Droplets },
    { to: '/alerts', label: t('nav.alerts'), icon: BellRing, badge: openAlerts || undefined },
    { to: '/profile', label: t('nav.profile'), icon: UserRound },
  ]

  const navLink = (item: (typeof items)[number], onNavigate?: () => void) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
          isActive
            ? 'bg-forest-50 text-forest-900 shadow-[inset_2px_0_0_0_theme(colors.forest.600)]'
            : 'text-forest-700 hover:bg-forest-50/70',
        )
      }
    >
      <item.icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {'badge' in item && item.badge ? (
        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-bold text-forest-800">{item.badge}</span>
      ) : null}
    </NavLink>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-cream text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-forest-100 bg-white/80 lg:flex">
        <div className="px-5 py-5">
          <NavLink to="/" aria-label="CropSentinel home">
            <Logo />
          </NavLink>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {items.map((item) => navLink(item))}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-forest-100" />
              <p className="px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-forest-500">
                {t('nav.admin')}
              </p>
              {navLink({ to: '/admin', label: t('nav.admin'), icon: ShieldCheck })}
            </>
          )}
        </nav>
        <div className="border-t border-forest-100 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-cream/70 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">
              {initials(profile?.full_name || 'Farmer')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest-900">{profile?.full_name || 'Farmer'}</p>
              <p className="truncate text-xs text-forest-600">
                {demoMode ? t('profile.modeDemo') : userId ? t('profile.modeSupabase') : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-forest-600 hover:bg-forest-50"
          >
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-forest-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <NavLink to="/" aria-label="CropSentinel home">
            <Logo compact />
          </NavLink>
          <div className="flex items-center gap-2">
            <LanguageSelect labelled={false} />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
              className="rounded-lg border border-forest-200 p-2 text-forest-800"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label={t('common.close')}
              className="absolute inset-0 bg-forest-950/40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="relative ml-auto flex h-full w-[17rem] max-w-[85vw] flex-col bg-white shadow-lift">
              <div className="flex items-center justify-between px-4 py-4">
                <Logo compact />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('common.close')}
                  className="rounded-lg p-1.5 text-forest-700"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
                {items.map((item) => navLink(item, () => setMenuOpen(false)))}
                {isAdmin &&
                  navLink({ to: '/admin', label: t('nav.admin'), icon: ShieldCheck }, () => setMenuOpen(false))}
              </nav>
              <div className="border-t border-forest-100 p-3">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full rounded-lg bg-cream px-3 py-2 text-sm font-semibold text-forest-800"
                >
                  {t('common.signOut')}
                </button>
              </div>
            </div>
          </div>
        )}

        {demoMode && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              <span className="font-bold">{t('profile.modeDemo')}.</span> {t('profile.demoBody')}{' '}
              <span className="opacity-80">
                ({integrationStatus.database}; AI: {integrationStatus.ai}; crop model: {integrationStatus.cropClinic})
              </span>
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-900" role="alert">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Small "what is connected" strip. Used on the chat welcome screen and the
 * irrigation page so the farmer always knows which parts are live.
 */
export function IntegrationStrip() {
  const { demoMode, readings } = useAppData()
  const items = [
    {
      label: demoMode ? 'Records: this browser' : 'Records: Supabase',
      ok: !demoMode,
      icon: Database,
    },
    {
      label:
        integrationStatus.cropClinic === 'configured' ? 'Crop image model: configured' : 'Crop image model: not connected',
      ok: integrationStatus.cropClinic === 'configured',
      icon: Camera,
    },
    {
      label: readings.length > 0 ? 'Soil sensor: readings arriving' : 'Soil sensor: no readings yet',
      ok: readings.length > 0,
      icon: Droplets,
    },
  ]
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium',
            item.ok ? 'border-leaf-200 bg-leaf-50 text-forest-800' : 'border-forest-200 bg-white text-forest-600',
          )}
        >
          <item.icon className="h-3 w-3" aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
