import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language } from '../types/database'
import { en, type Dictionary, type TranslationKey } from './en'
import { kn } from './kn'
import { hi } from './hi'

export const dictionaries: Record<Language, Dictionary> = { en, kn, hi }

export const LANGUAGES: Array<{ code: Language; label: string; english: string }> = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi' },
]

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Translate
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const STORAGE_KEY = 'cropsentinel.language'

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'kn' || stored === 'hi') return stored
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage may be unavailable; the in-memory choice still works */
    }
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      const dictionary = dictionaries[language] ?? en
      let text = dictionary[key] ?? en[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value))
        }
      }
      return text
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return context
}
