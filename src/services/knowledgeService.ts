import type { AgriculturalKnowledge, Language } from '../types/database'
import type { DataSource } from '../data/dataSource'

/**
 * Agricultural Knowledge Service.
 *
 * Retrieval over the `agricultural_knowledge` table. It is intentionally a
 * simple, inspectable keyword + topic scorer rather than a vector store so the
 * behaviour is easy to reason about today. When a real RAG pipeline is added,
 * only `retrieveKnowledge` needs to change — the assistant already treats it as
 * "retrieve first, then answer".
 */

const STOP_WORDS = new Set([
  'the', 'and', 'are', 'for', 'why', 'how', 'can', 'should', 'when', 'what', 'with', 'my', 'is',
  'do', 'does', 'to', 'of', 'in', 'on', 'a', 'an', 'it', 'i', 'me', 'have', 'has', 'be', 'not',
])

export interface RetrievedKnowledge {
  entry: AgriculturalKnowledge
  score: number
  /** True when the entry is a translation miss and English text is shown. */
  englishFallback: boolean
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

export function scoreEntry(entry: AgriculturalKnowledge, queryTokens: string[], cropType?: string | null): number {
  const haystackTitle = entry.title.toLowerCase()
  const haystackBody = entry.content.toLowerCase()
  const haystackTopic = entry.topic.toLowerCase()
  let score = 0
  for (const token of queryTokens) {
    if (haystackTitle.includes(token)) score += 3
    if (haystackTopic.includes(token)) score += 2
    if (haystackBody.includes(token)) score += 1
  }
  if (cropType && entry.crop_type && entry.crop_type.toLowerCase() === cropType.toLowerCase()) {
    score += 4
  }
  return score
}

/**
 * Retrieve the most relevant entries for a question.
 * Falls back to English content when the requested language has no match, and
 * flags that fallback so the assistant can say so honestly.
 */
export async function retrieveKnowledge(
  source: DataSource,
  query: string,
  language: Language,
  options: { cropType?: string | null; limit?: number } = {},
): Promise<RetrievedKnowledge[]> {
  const limit = options.limit ?? 3
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const [localized, english] = await Promise.all([
    source.listKnowledge({ language }),
    language === 'en' ? Promise.resolve([] as AgriculturalKnowledge[]) : source.listKnowledge({ language: 'en' }),
  ])

  const scoredLocal = localized
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, options.cropType), englishFallback: false }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const results: RetrievedKnowledge[] = scoredLocal.slice(0, limit)
  if (results.length < limit) {
    const scoredEnglish = english
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens, options.cropType), englishFallback: true }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
    results.push(...scoredEnglish.slice(0, limit - results.length))
  }
  return results
}
