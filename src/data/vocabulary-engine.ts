import { vocabularyWords } from './vocabulary'
import type {
  VocabularyQuestion,
  ReorderQuestion,
  VocabularyResult,
  VocabularySession,
  VocabularySessionMode,
  VocabularyStatus,
  VocabularyWord,
  WordProgress
} from '../types'

const shuffle = <T>(values: T[], random: () => number): T[] => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

const optionValue = (word: VocabularyWord, type: VocabularyQuestion['type']) =>
  type === 'en-to-ja' ? word.meaningJa : word.word

// Prefer peers; small levels may borrow distractors from already accessible lower levels.
const distractorOptions = (
  word: VocabularyWord,
  type: VocabularyQuestion['type'],
  random: () => number,
  candidates: VocabularyWord[] = vocabularyWords
) => {
  const peers = candidates.filter((candidate) => candidate.level === word.level)
  const lower = candidates.filter((candidate) => candidate.level < word.level)
  const pools = [
    peers.filter((candidate) => candidate.partOfSpeech === word.partOfSpeech),
    peers,
    lower.filter((candidate) => candidate.partOfSpeech === word.partOfSpeech),
    lower
  ]
  const seen = new Set([optionValue(word, type).toLowerCase()])
  const options: string[] = []
  for (const pool of pools) {
    for (const candidate of shuffle(pool, random)) {
      if (candidate.id === word.id) continue
      const value = optionValue(candidate, type)
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      options.push(value)
      if (options.length === 3) return options
    }
  }
  return options
}

const exerciseTypes: VocabularyQuestion['type'][] = [
  'en-to-ja',
  'ja-to-en',
  'flashcard',
  'fill-blank',
  'reorder'
]

const wordMatch = (sentence: string, word: string) => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').exec(sentence)
}

const safeExample = (word: VocabularyWord) => {
  const example = word.example.trim()
  return wordMatch(example, word.word)
    ? example
    : `Emma wrote “${word.word}” in her vocabulary notebook.`
}

const hasUsableBilingualStructure = (word: VocabularyWord) => {
  const example = word.example.trim()
  return (
    Boolean(word.exampleJa.trim()) &&
    example.toLocaleLowerCase().includes(word.word.toLocaleLowerCase()) &&
    !/["'“”‘’[\]]/.test(example) &&
    !/\bthe word\b/i.test(example)
  )
}

export const supportsSentenceExercise = (word: VocabularyWord, type: 'fill-blank' | 'reorder') =>
  Boolean(word.exampleInfo?.allowedExercises.includes(type)) && hasUsableBilingualStructure(word)

export const hasReorderExample = (word: VocabularyWord) => supportsSentenceExercise(word, 'reorder')

const reorderExample = (word: VocabularyWord) => {
  if (!hasReorderExample(word)) throw new Error(`No eligible reorder example for ${word.id}`)
  // Use the resolved catalog example for both display and sentence exercises.
  return { sentence: word.example.trim(), sentenceJa: word.exampleJa.trim() }
}

export const buildFillBlank = (
  word: VocabularyWord,
  random: () => number = Math.random,
  candidates: VocabularyWord[] = vocabularyWords
) => {
  const alternatives = distractorOptions(word, 'fill-blank', random, candidates)
  const sentence = safeExample(word)
  const start = wordMatch(sentence, word.word)!.index
  return {
    sentence,
    prompt: `${sentence.slice(0, start)}____${sentence.slice(start + word.word.length)}`,
    promptJa:
      sentence === word.example.trim()
        ? word.exampleJa
        : `エマは単語帳に「${word.word}」と書きました。`,
    options: shuffle([word.word, ...alternatives], random),
    answer: word.word
  }
}

export function isCorrectReorder(
  question: Pick<ReorderQuestion, 'tokens' | 'correctOrder'>,
  placedIds: string[]
): boolean {
  const { tokens, correctOrder } = question
  if (!tokens?.length || !correctOrder || placedIds.length !== correctOrder.length) return false
  if (new Set(placedIds).size !== placedIds.length) return false
  const byId = new Map(tokens.map((token) => [token.id, token.text]))
  return placedIds.every(
    (id, index) =>
      byId.has(id) &&
      byId.has(correctOrder[index]) &&
      byId.get(id) === byId.get(correctOrder[index])
  )
}

export const buildReorder = (word: VocabularyWord, random: () => number = Math.random) => {
  const { sentence, sentenceJa } = reorderExample(word)
  const correctTokens = sentence.split(/\s+/).filter(Boolean)
  const tokens = correctTokens.map((text, index) => ({
    id: `${word.id}-token-${index}`,
    text
  }))
  let shuffled = shuffle(tokens, random)
  if (shuffled.length > 1 && shuffled.every((token, index) => token.id === tokens[index]?.id)) {
    shuffled = [...shuffled.slice(1), shuffled[0]]
  }
  return {
    prompt: sentence,
    promptJa: sentenceJa,
    tokens: shuffled,
    correctOrder: tokens.map((token) => token.id)
  }
}

export function buildVocabularySession(
  level: number,
  progress: Record<string, WordProgress>,
  random: () => number = Math.random,
  sessionId = `vocab-${Date.now()}`,
  mode: VocabularySessionMode = 'mixed',
  questionCount: number | 'all' = 'all',
  statuses: VocabularyStatus[] = ['new', 'learning', 'mastered']
): VocabularySession {
  const levelPool = vocabularyWords.filter((word) => word.level === level)
  const pool = levelPool.filter((word) => {
    const status = progress[word.id]?.status ?? 'new'
    return statuses.includes(status)
  })
  const limit = questionCount === 'all' ? pool.length : Math.min(questionCount, pool.length)
  const selected = shuffle(pool, random).slice(0, limit)
  const types: VocabularyQuestion['type'][] =
    mode === 'mixed'
      ? shuffle(
          selected.map((_, index) => exerciseTypes[index % exerciseTypes.length]),
          random
        )
      : Array.from({ length: selected.length }, () => mode)

  const questions = selected.map((word, index): VocabularyQuestion => {
    const requestedType = types[index]
    const type =
      (requestedType === 'reorder' || requestedType === 'fill-blank') &&
      !supportsSentenceExercise(word, requestedType)
        ? 'en-to-ja'
        : requestedType
    if (type === 'flashcard') return { wordId: word.id, type, options: [] }
    if (type === 'fill-blank') {
      return { wordId: word.id, type, ...buildFillBlank(word, random) }
    }
    if (type === 'reorder') {
      return { wordId: word.id, type, options: [], ...buildReorder(word, random) }
    }
    const wrong = distractorOptions(word, type, random)
    return {
      wordId: word.id,
      type,
      options: shuffle([optionValue(word, type), ...wrong], random)
    }
  })

  return {
    id: sessionId,
    level,
    mode,
    questions,
    answers: [],
    currentIndex: 0,
    startedAt: new Date().toISOString()
  }
}

export function rewardForAccuracy(accuracy: number, answeredCount: number) {
  if (accuracy >= 80) return { earnedXp: answeredCount * 3, affectionChange: 3, trustChange: 2 }
  if (accuracy >= 50) return { earnedXp: answeredCount * 2, affectionChange: 2, trustChange: 1 }
  return { earnedXp: answeredCount, affectionChange: 1, trustChange: 0 }
}

export function summarizeVocabularySession(
  session: VocabularySession,
  masteredWordIds: string[],
  relationshipRewardAllowed: boolean
): VocabularyResult {
  const correctCount = session.answers.filter((answer) => answer.correct).length
  const totalCount = session.answers.length
  const accuracy = totalCount ? Math.round((correctCount / totalCount) * 100) : 0
  const reward = rewardForAccuracy(accuracy, totalCount)
  return {
    sessionId: session.id,
    ...(session.unitNumber === undefined ? {} : { unitNumber: session.unitNumber }),
    level: session.level,
    mode: session.mode,
    correctCount,
    totalCount,
    accuracy,
    earnedXp: reward.earnedXp,
    affectionChange: relationshipRewardAllowed ? reward.affectionChange : 0,
    trustChange: relationshipRewardAllowed ? reward.trustChange : 0,
    masteredWordIds,
    reviewWordIds: session.answers
      .filter((answer) => !answer.correct)
      .map((answer) => answer.wordId),
    answers: session.answers.map((answer) => ({ ...answer })),
    completedAt: new Date().toISOString()
  }
}
