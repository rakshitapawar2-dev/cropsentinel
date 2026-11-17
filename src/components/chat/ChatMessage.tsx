import { Image as ImageIcon, Info, Sprout } from 'lucide-react'
import type { Message } from '../../types/database'
import { formatDateTime } from '../../lib/utils'
import { LogoMark } from '../layout/Logo'
import { Badge } from '../ui/primitives'
import { useLanguage } from '../../i18n/LanguageProvider'

export function ChatMessage({ message }: { message: Message }) {
  const { language, t } = useLanguage()
  const isFarmer = message.sender === 'farmer'
  const isSystem = message.sender === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center px-2 py-1">
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {message.message_text}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex gap-2.5 sm:gap-3 ${isFarmer ? 'justify-end' : 'justify-start'}`}>
      {!isFarmer && (
        <span className="mt-0.5 hidden shrink-0 sm:block" aria-hidden>
          <LogoMark className="h-8 w-8" />
        </span>
      )}
      <div className={`max-w-[min(46rem,88%)] ${isFarmer ? 'items-end' : ''}`}>
        <div
          className={
            isFarmer
              ? 'rounded-2xl rounded-br-md bg-forest-700 px-4 py-2.5 text-[0.95rem] leading-relaxed text-white shadow-soft'
              : 'rounded-2xl rounded-bl-md border border-forest-100 bg-white px-4 py-3 text-[0.95rem] leading-relaxed text-ink shadow-soft'
          }
        >
          {message.attachment_url && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block overflow-hidden rounded-xl border border-white/20"
              aria-label={t('chat.attachment')}
            >
              <img
                src={message.attachment_url}
                alt="Crop photo attached to this message"
                className="max-h-56 w-full object-cover"
                loading="lazy"
              />
            </a>
          )}
          <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
        </div>
        <div
          className={`mt-1 flex items-center gap-1.5 px-1 text-[0.68rem] text-forest-600 ${
            isFarmer ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatDateTime(message.created_at, language)}</span>
          {isFarmer && message.attachment_url && (
            <Badge tone="neutral">
              <ImageIcon className="h-3 w-3" aria-hidden /> photo
            </Badge>
          )}
        </div>
      </div>
      {isFarmer && (
        <span
          className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-800 sm:flex"
          aria-hidden
        >
          <Sprout className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}

export function ThinkingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <span className="mt-0.5 hidden shrink-0 sm:block" aria-hidden>
        <LogoMark className="h-8 w-8" />
      </span>
      <div className="rounded-2xl rounded-bl-md border border-forest-100 bg-white px-4 py-3 shadow-soft">
        <p className="flex items-center gap-1.5" aria-label={label} role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-forest-400" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-forest-400 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-forest-400 [animation-delay:300ms]" />
        </p>
        <p className="mt-1.5 text-xs text-forest-600">{label}</p>
      </div>
    </div>
  )
}
