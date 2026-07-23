import { vocabularyWords } from './vocabulary'
import type {
  VocabularyQuestion,
  VocabularyResult,
  VocabularySession,
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

export function buildVocabularySession(
  level: number,
  progress: Record<string, WordProgress>,
  random: () => number = Math.random,
  sessionId = `vocab-${Date.now()}`
): VocabularySession {
  const pool = vocabularyWords.filter((word) => word.level === level)
  const priority = [...pool].sort((a, b) => {
    const rank = (word: VocabularyWord) => {
      const status = progress[word.id]?.status ?? 'new'
      return status === 'learning' ? 0 : status === 'new' ? 1 : 2
    }
    return rank(a) - rank(b) || random() - 0.5
  })
  const selected = priority.slice(0, 10)
  const types: VocabularyQuestion['type'][] = [
    'en-to-ja',
    'ja-to-en',
    'en-to-ja',
    'ja-to-en',
    'flashcard',
    'en-to-ja',
    'ja-to-en',
    'en-to-ja',
    'ja-to-en',
    'flashcard'
  ]

  const questions = selected.map((word, index): VocabularyQuestion => {
    const type = types[index]
    if (type === 'flashcard') return { wordId: word.id, type, options: [] }
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
    completedAt: new Date().toISOString()
  }
}
