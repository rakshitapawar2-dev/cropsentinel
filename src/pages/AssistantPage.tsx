import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, History, Info, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { Conversation, Message } from '../types/database'
import { dataSource } from '../data'
import { useLanguage } from '../i18n/LanguageProvider'
import { useAppData } from '../providers/AppDataProvider'
import { formatDateTime, relativeTime } from '../lib/utils'
import { generateAssistantReply, type AssistantEngine } from '../services/aiAssistantService'
import { CROP_CLINIC_NOT_CONNECTED } from '../services/cropClinicService'
import { supabaseConfigured } from '../lib/env'
import { LogoMark } from '../components/layout/Logo'
import { LanguageSelect } from '../components/layout/LanguageSelect'
import { IntegrationStrip } from '../components/layout/AppShell'
import { Button, Notice } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { ChatMessage, ThinkingBubble } from '../components/chat/ChatMessage'
import { ChatComposer } from '../components/chat/ChatComposer'

const SUGGESTIONS = ['suggest.yellow', 'suggest.soil', 'suggest.water', 'suggest.disease', 'suggest.health', 'suggest.attention'] as const

export default function AssistantPage() {
  const { t, language, setLanguage } = useLanguage()
  const { userId, plants, refresh } = useAppData()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<{ file: File; preview: string; name: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [lastMeta, setLastMeta] = useState<{ usedFarmData: boolean; engine: AssistantEngine } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null

  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveId(conversationId)
    setHistoryOpen(false)
    setLastMeta(null)
    try {
      const loaded = await dataSource.listMessages(conversationId)
      setMessages(loaded)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that conversation.')
    }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      if (!userId) {
        setLoadingHistory(false)
        return
      }
      try {
        const loaded = await dataSource.listConversations(userId)
        if (!active) return
        setConversations(loaded)
        if (loaded.length > 0) {
          await loadConversation(loaded[0].id)
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your conversations.')
      } finally {
        if (active) setLoadingHistory(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [userId, loadConversation])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, sending])

  function startNewConversation() {
    setActiveId(null)
    setMessages([])
    setInput('')
    setAttachment(null)
    setSelectedPlantId(null)
    setError(null)
    setLastMeta(null)
    setHistoryOpen(false)
  }

  async function removeConversation(conversationId: string) {
    try {
      await dataSource.deleteConversation(conversationId)
      setConversations((previous) => previous.filter((conversation) => conversation.id !== conversationId))
      if (activeId === conversationId) startNewConversation()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete that conversation.')
    }
  }

  async function send() {
    const text = input.trim()
    if ((!text && !attachment) || sending || !userId) return

    setSending(true)
    setError(null)
    const file = attachment?.file ?? null
    const preview = attachment?.preview ?? null
    let conversationId: string | null = activeId
    setInput('')
    setAttachment(null)

    try {
      let conversation = activeConversation
      if (!conversation) {
        const title = (text || 'Crop photo').slice(0, 60)
        conversation = await dataSource.createConversation(userId, title, language)
        setConversations((previous) => [conversation as Conversation, ...previous])
        setActiveId(conversation.id)
      }
      conversationId = conversation.id

      const attachmentUrl = file ? await dataSource.uploadCropImage(file, userId) : null
      const farmerMessage = await dataSource.addMessage({
        conversation_id: conversation.id,
        sender: 'farmer',
        message_text: text || 'Plant photo attached.',
        attachment_url: attachmentUrl,
      })
      setMessages((previous) => [...previous, farmerMessage])

      // A photo sent with a plant selected becomes a real observation entry.
      if (attachmentUrl && selectedPlantId) {
        await dataSource.createObservation({
          plant_id: selectedPlantId,
          observation_date: new Date().toISOString(),
          image_url: attachmentUrl,
          symptoms: text || null,
          soil_condition: null,
          analysis_status: 'model_unavailable',
          analysis_result: CROP_CLINIC_NOT_CONNECTED,
          confidence_score: null,
          farmer_notes: text || null,
          follow_up_status: 'open',
        })
        await refresh()
      }

      const reply = await generateAssistantReply({
        source: dataSource,
        userId,
        language,
        message: text,
        hasAttachment: Boolean(attachmentUrl),
        plantId: selectedPlantId,
        conversationId: conversation.id,
      })
      setLastMeta({ usedFarmData: reply.usedFarmData, engine: reply.engine })

      const storedText =
        reply.sources.length > 0
          ? `${reply.text}\n\n${t('chat.sources')}: ${reply.sources
              .map((source) => `${source.title} — ${source.sourceName}`)
              .join('; ')}`
          : reply.text

      const assistantMessage = await dataSource.addMessage({
        conversation_id: conversation.id,
        sender: 'assistant',
        message_text: storedText,
        attachment_url: null,
      })
      setMessages((previous) => [...previous, assistantMessage])
      setConversations((previous) =>
        previous.map((item) =>
          item.id === conversation?.id ? { ...item, updated_at: new Date().toISOString() } : item,
        ),
      )
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'CropSentinel could not answer right now. Please try again.'
      setError(message)
      if (conversationId) {
        try {
          const systemMessage = await dataSource.addMessage({
            conversation_id: conversationId,
            sender: 'system',
            message_text: t('chat.stopped'),
            attachment_url: null,
          })
          setMessages((previous) => [...previous, systemMessage])
        } catch {
          /* the inline error banner already explains the problem */
        }
      }
    } finally {
      setSending(false)
      if (preview) URL.revokeObjectURL(preview)
    }
  }

  async function changeLanguage(next: (typeof language)) {
    setLanguage(next)
    if (activeConversation) {
      try {
        await dataSource.updateConversation(activeConversation.id, { language: next })
      } catch {
        /* the choice still applies to this session */
      }
    }
  }

  function askSuggestion(question: string) {
    setInput(question)
    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null
    textarea?.focus()
  }

  const historyList = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-sm font-bold text-forest-900">{t('chat.history')}</h2>
        <button
          type="button"
          onClick={() => setHistoryOpen(false)}
          className="rounded-lg p-1 text-forest-600 lg:hidden"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loadingHistory ? (
          <p className="px-2 py-3 text-xs text-forest-600">{t('common.loading')}</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-forest-600">{t('chat.historyEmpty')}</p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => (
              <li key={conversation.id} className="group flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => void loadConversation(conversation.id)}
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    conversation.id === activeId ? 'bg-forest-50' : 'hover:bg-cream'
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-forest-900">{conversation.title}</span>
                  <span className="mt-0.5 block text-[0.68rem] text-forest-600">
                    {relativeTime(conversation.updated_at)} · {formatDateTime(conversation.created_at, language)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeConversation(conversation.id)}
                  className="mt-1.5 rounded-lg p-1 text-forest-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete conversation ${conversation.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 border-r border-forest-100 bg-white/70 lg:flex">
        {historyList}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-forest-100 bg-white/80 px-3 py-2.5 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="lg:hidden" aria-hidden>
              <LogoMark className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-forest-900 sm:text-lg">
                {activeConversation ? activeConversation.title : t('nav.assistant')}
              </h1>
              <p className="truncate text-[0.7rem] text-forest-600">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageSelect value={language} onChange={(next) => void changeLanguage(next)} labelled={false} />
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-lg border border-forest-200 p-2 text-forest-800 lg:hidden"
              aria-label={t('chat.history')}
            >
              <History className="h-4 w-4" aria-hidden />
            </button>
            <Button size="sm" variant="secondary" onClick={startNewConversation}>
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('chat.newConversation')}</span>
            </Button>
          </div>
        </header>

        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <div className="mx-auto w-full max-w-chat space-y-4">
            {messages.length === 0 && !sending ? (
              <div className="space-y-5 pb-2">
                <div className="rounded-2xl border border-forest-100 bg-white p-5 shadow-soft sm:p-6">
                  <div className="flex items-start gap-3">
                    <LogoMark className="h-11 w-11 shrink-0" />
                    <div>
                      <h2 className="text-lg font-bold text-forest-900">CropSentinel</h2>
                      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink">{t('chat.welcome')}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <IntegrationStrip />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-forest-600">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    {t('chat.suggestions')}
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((key) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => askSuggestion(t(key))}
                          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-forest-100 bg-white px-3.5 py-3 text-left text-sm font-medium text-forest-900 transition-colors hover:border-forest-300 hover:bg-forest-50/60"
                        >
                          <span>{t(key)}</span>
                          <ArrowRight
                            className="h-4 w-4 shrink-0 text-forest-400 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <Notice tone="neutral" icon={<Info className="h-4 w-4" />}>
                  {supabaseConfigured ? t('chat.engineBackend') : t('chat.engineLocal')}
                </Notice>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {lastMeta && !sending && (
                  <p className="flex items-center justify-center gap-1.5 px-3 text-center text-[0.68rem] text-forest-600">
                    <Info className="h-3 w-3 shrink-0" aria-hidden />
                    {lastMeta.usedFarmData ? t('chat.usedFarmData') : t('chat.noFarmData')}
                  </p>
                )}
                {sending && <ThinkingBubble label={t('chat.thinkingNote')} />}
              </>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {error && (
          <div className="px-3 pb-1 sm:px-5">
            <div className="mx-auto w-full max-w-chat">
              <Notice tone="red" title={t('common.error')}>
                {error}
              </Notice>
            </div>
          </div>
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={() => void send()}
          onPickImage={(file) => {
            setAttachment({ file, preview: URL.createObjectURL(file), name: file.name })
          }}
          attachmentName={attachment?.name ?? null}
          attachmentPreview={attachment?.preview ?? null}
          onClearAttachment={() => setAttachment(null)}
          sending={sending}
          plants={plants}
          selectedPlantId={selectedPlantId}
          onSelectPlant={setSelectedPlantId}
        />
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('chat.history')}>
        <div className="max-h-[60vh] overflow-y-auto">{historyList}</div>
      </Modal>

      <span className="sr-only" aria-live="polite">
        {sending ? t('chat.thinking') : ''}
      </span>
    </div>
  )
}
