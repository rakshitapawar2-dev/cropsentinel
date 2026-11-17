import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Check, CheckCheck, Info, ShieldAlert } from 'lucide-react'
import type { AlertStatus } from '../types/database'
import { dataSource } from '../data'
import { useAppData } from '../providers/AppDataProvider'
import { useLanguage } from '../i18n/LanguageProvider'
import { Badge, Button, Card, EmptyState, Notice, Page, PageHeader } from '../components/ui/primitives'
import { formatDateTime, relativeTime } from '../lib/utils'

type Filter = 'open' | 'all' | 'resolved'

export default function AlertsPage() {
  const { t, language } = useLanguage()
  const { alerts, plants, refresh } = useAppData()
  const [filter, setFilter] = useState<Filter>('open')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plantName = (id: string) => plants.find((plant) => plant.id === id)?.plant_name ?? 'Plant'

  const visible = useMemo(() => {
    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    const filtered = alerts.filter((alert) => {
      if (filter === 'all') return true
      if (filter === 'resolved') return alert.status === 'resolved'
      return alert.status !== 'resolved'
    })
    return [...filtered].sort((a, b) => {
      const severityDiff = (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
      if (severityDiff !== 0) return severityDiff
      return b.created_at.localeCompare(a.created_at)
    })
  }, [alerts, filter])

  async function updateStatus(id: string, status: AlertStatus) {
    setBusyId(id)
    setError(null)
    try {
      await dataSource.updateAlertStatus(id, status)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the alert.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Page>
      <PageHeader
        icon={<BellRing className="h-5 w-5" />}
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        actions={
          <div className="flex gap-1 rounded-xl border border-forest-200 bg-white p-1" role="group" aria-label="Filter alerts">
            {(['open', 'all', 'resolved'] as Filter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === value ? 'bg-forest-700 text-white' : 'text-forest-700 hover:bg-forest-50'
                }`}
              >
                {value === 'open' ? t('alerts.status.open') : value === 'all' ? t('common.all') : t('alerts.status.resolved')}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="red" title={t('common.error')}>
            {error}
          </Notice>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-7 w-7" />} title={t('alerts.empty')} body={t('alerts.generated')} />
      ) : (
        <ul className="space-y-3">
          {visible.map((alert) => (
            <Card as="li" key={alert.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}>
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {t(`alerts.severity.${alert.severity}` as 'alerts.severity.warning')}
                  </Badge>
                  <Badge tone={alert.status === 'resolved' ? 'green' : alert.status === 'acknowledged' ? 'blue' : 'neutral'}>
                    {t(`alerts.status.${alert.status}` as 'alerts.status.open')}
                  </Badge>
                  <Link
                    to={`/plants/${alert.plant_id}`}
                    className="text-xs font-semibold text-forest-700 underline-offset-2 hover:underline"
                  >
                    {plantName(alert.plant_id)}
                  </Link>
                  <span className="text-xs text-forest-600">{relativeTime(alert.created_at)}</span>
                </div>
                <h2 className="mt-1.5 text-base font-bold text-forest-900">{alert.title}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-forest-700">{alert.description}</p>
                <p className="mt-1 text-[0.68rem] text-forest-500">{formatDateTime(alert.created_at, language)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {alert.status === 'open' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === alert.id}
                    onClick={() => void updateStatus(alert.id, 'acknowledged')}
                  >
                    <Check className="h-4 w-4" aria-hidden /> {t('alerts.acknowledge')}
                  </Button>
                )}
                {alert.status !== 'resolved' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === alert.id}
                    onClick={() => void updateStatus(alert.id, 'resolved')}
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden /> {t('alerts.resolve')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Notice tone="neutral" icon={<Info className="h-4 w-4" />}>
          {t('alerts.generated')}
        </Notice>
      </div>
    </Page>
  )
}
