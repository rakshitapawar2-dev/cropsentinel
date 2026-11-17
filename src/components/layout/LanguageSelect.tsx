import { Languages } from 'lucide-react'
import { LANGUAGES, useLanguage } from '../../i18n/LanguageProvider'
import type { Language } from '../../types/database'
import { cn } from '../../lib/utils'

/**
 * Language selector. Labels show every language in its own script so a farmer
 * can find their language without reading English.
 */
export function LanguageSelect({
  value,
  onChange,
  className,
  labelled = true,
}: {
  value?: Language
  onChange?: (language: Language) => void
  className?: string
  labelled?: boolean
}) {
  const { language, setLanguage, t } = useLanguage()
  const current = value ?? language

  return (
    <label className={cn('inline-flex items-center gap-2', className)}>
      <Languages className="h-4 w-4 shrink-0 text-forest-600" aria-hidden />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={current}
        onChange={(event) => {
          const next = event.target.value as Language
          if (onChange) onChange(next)
          else setLanguage(next)
        }}
        aria-label={t('common.language')}
        className="rounded-lg border border-forest-200 bg-white px-2 py-1.5 text-sm font-medium text-forest-900 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-200"
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code}>
            {labelled ? `${option.label} (${option.english})` : option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
