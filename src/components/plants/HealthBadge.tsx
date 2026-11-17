import { AlertTriangle, CheckCircle2, HelpCircle, Info } from 'lucide-react'
import type { HealthLevel } from '../../services/plantMonitoringService'
import { useLanguage } from '../../i18n/LanguageProvider'
import { Badge } from '../ui/primitives'

/**
 * Status is always icon + text + colour, never colour alone.
 */
export function HealthBadge({ level }: { level: HealthLevel }) {
  const { t } = useLanguage()
  if (level === 'attention') {
    return (
      <Badge tone="red">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {t('plants.statusAttention')}
      </Badge>
    )
  }
  if (level === 'watch') {
    return (
      <Badge tone="amber">
        <Info className="h-3.5 w-3.5" aria-hidden />
        {t('plants.statusWatch')}
      </Badge>
    )
  }
  if (level === 'healthy') {
    return (
      <Badge tone="green">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        {t('plants.statusHealthy')}
      </Badge>
    )
  }
  return (
    <Badge>
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      {t('plants.statusUnknown')}
    </Badge>
  )
}
