import { vocabularyWords } from './vocabulary'
import { reorderExamples } from './reorder-examples'
import type {
  VocabularyQuestion,
  VocabularyResult,
  VocabularySession,
  VocabularySessionMode,
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

const exerciseTypes: VocabularyQuestion['type'][] = [
  'en-to-ja',
  'ja-to-en',
  'flashcard',
  'fill-blank',
  'reorder'
]

const safeExample = (word: VocabularyWord) => {
  const example = word.example.trim()
  return example.toLocaleLowerCase().includes(word.word.toLocaleLowerCase())
    ? example
    : `Emma wrote “${word.word}” in her vocabulary notebook.`
}

const isNaturalBilingualExample = (word: VocabularyWord) => {
  const example = word.example.trim()
  return (
    Boolean(word.exampleJa.trim()) &&
    example.toLocaleLowerCase().includes(word.word.toLocaleLowerCase()) &&
    !/["'“”‘’[\]]/.test(example) &&
    !/\bthe word\b/i.test(example)
  )
}

export const hasNaturalReorderExample = (word: VocabularyWord) =>
  Boolean(reorderExamples[word.id]) || isNaturalBilingualExample(word)

const reorderExample = (word: VocabularyWord) => {
  const curated = reorderExamples[word.id]
  if (!curated && isNaturalBilingualExample(word)) {
    return { sentence: word.example.trim(), sentenceJa: word.exampleJa.trim() }
  }
  if (!curated) throw new Error(`No natural reorder example for ${word.id}`)
  return { sentence: curated.english, sentenceJa: curated.japanese }
}

export const buildFillBlank = (word: VocabularyWord) => {
  const sentence = safeExample(word)
  const start = sentence.toLocaleLowerCase().indexOf(word.word.toLocaleLowerCase())
  return {
    prompt: `${sentence.slice(0, start)}____${sentence.slice(start + word.word.length)}`,
    answer: word.word
  }
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
  _progress: Record<string, WordProgress>,
  random: () => number = Math.random,
  sessionId = `vocab-${Date.now()}`,
  mode: VocabularySessionMode = 'mixed',
  questionCount: number | 'all' = 'all'
): VocabularySession {
  const pool = vocabularyWords.filter((word) => word.level === level)
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
      requestedType === 'reorder' && !hasNaturalReorderExample(word) ? 'fill-blank' : requestedType
    if (type === 'flashcard') return { wordId: word.id, type, options: [] }
    if (type === 'fill-blank') {
      return { wordId: word.id, type, options: [], ...buildFillBlank(word) }
    }
    if (type === 'reorder') {
      return { wordId: word.id, type, options: [], ...buildReorder(word, random) }
    }
    const alternatives = pool.filter(
      (candidate) => candidate.id !== word.id && candidate.partOfSpeech === word.partOfSpeech
    )
    const fallback = pool.filter((candidate) => candidate.id !== word.id)
    const candidates = alternatives.length >= 3 ? alternatives : fallback
    const wrong = shuffle(candidates, random)
      .map((candidate) => optionValue(candidate, type))
      .filter((value, optionIndex, all) => all.indexOf(value) === optionIndex)
      .slice(0, 3)
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

export function rewardForAccuracy(accuracy: number) {
  if (accuracy >= 80) return { earnedXp: 30, affectionChange: 3, trustChange: 2 }
  if (accuracy >= 50) return { earnedXp: 20, affectionChange: 2, trustChange: 1 }
  return { earnedXp: 10, affectionChange: 1, trustChange: 0 }
}

export function summarizeVocabularySession(
  session: VocabularySession,
  masteredWordIds: string[],
  relationshipRewardAllowed: boolean
): VocabularyResult {
  const correctCount = session.answers.filter((answer) => answer.correct).length
  const accuracy = Math.round((correctCount / session.questions.length) * 100)
  const reward = rewardForAccuracy(accuracy)
  return {
    sessionId: session.id,
    level: session.level,
    mode: session.mode,
    correctCount,
    totalCount: session.questions.length,
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
