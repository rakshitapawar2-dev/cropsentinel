import { useRef } from 'react'
import { ImagePlus, Mic, Send, Sprout, X } from 'lucide-react'
import type { Plant } from '../../types/database'
import { useLanguage } from '../../i18n/LanguageProvider'
import { cn } from '../../lib/utils'

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onPickImage,
  attachmentName,
  attachmentPreview,
  onClearAttachment,
  sending,
  plants,
  selectedPlantId,
  onSelectPlant,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onPickImage: (file: File) => void
  attachmentName: string | null
  attachmentPreview: string | null
  onClearAttachment: () => void
  sending: boolean
  plants: Plant[]
  selectedPlantId: string | null
  onSelectPlant: (plantId: string | null) => void
}) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="border-t border-forest-100 bg-white/95 px-3 pb-3 pt-3 backdrop-blur sm:px-4 safe-bottom">
      <div className="mx-auto w-full max-w-chat">
        {plants.length > 0 && (
          <label className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-cream/70 px-2.5 py-1 text-xs text-forest-700">
            <Sprout className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="shrink-0 font-medium">Talking about</span>
            <select
              value={selectedPlantId ?? ''}
              onChange={(event) => onSelectPlant(event.target.value || null)}
              className="max-w-[11rem] truncate rounded-md border border-forest-200 bg-white px-1.5 py-1 text-xs font-semibold text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-200"
              aria-label="Plant this conversation is about"
            >
              <option value="">No specific plant</option>
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.plant_name}
                </option>
              ))}
            </select>
          </label>
        )}

        {(attachmentPreview || attachmentName) && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-forest-200 bg-cream/70 p-2">
            {attachmentPreview && (
              <img src={attachmentPreview} alt="" className="h-11 w-11 rounded-lg object-cover" />
            )}
            <p className="min-w-0 flex-1 truncate text-xs text-forest-800">{attachmentName}</p>
            <button
              type="button"
              onClick={onClearAttachment}
              className="rounded-lg p-1.5 text-forest-600 hover:bg-white"
              aria-label="Remove attached photo"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          className="flex items-end gap-2 rounded-2xl border border-forest-200 bg-white p-2 shadow-soft focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPickImage(file)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl p-2.5 text-forest-700 hover:bg-forest-50"
            aria-label={t('chat.upload')}
            title={t('chat.upload')}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </button>

          <label htmlFor="chat-input" className="sr-only">
            {t('chat.placeholder')}
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit()
              }
            }}
            placeholder={t('chat.placeholder')}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2.5 text-[0.95rem] leading-relaxed text-ink placeholder:text-forest-400 focus:outline-none"
          />

          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t('chat.voiceUnavailable')}
            className="hidden rounded-xl p-2.5 text-forest-300 sm:block"
            aria-label={`${t('chat.voice')} — ${t('chat.voiceUnavailable')}`}
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>

          <button
            type="submit"
            disabled={sending || (!value.trim() && !attachmentName)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white transition-colors',
              'bg-forest-700 hover:bg-forest-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700',
              'disabled:cursor-not-allowed disabled:bg-forest-300',
            )}
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('chat.send')}</span>
          </button>
        </form>

        <p className="mt-1.5 px-1 text-center text-[0.68rem] leading-relaxed text-forest-600">
          {t('chat.disclaimer')} · {t('chat.voiceUnavailable')}
        </p>
      </div>
    </div>
  )
}
