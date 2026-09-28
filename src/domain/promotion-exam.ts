import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import type { ChoiceQuestion, PromotionExamSession, WordProgress } from '../types'

export const EXAM_SIZE = 20
export const EXAM_PASS_COUNT = 18
export const lastVocabularyLevel = vocabularyLevels.at(-1)!.id
export function examProgress(level: number, progress: Record<string, WordProgress>) {
  const words = vocabularyWords.filter((word) => word.level === level)
  const mastered = words.filter((word) => progress[word.id]?.status === 'mastered').length
  const required = Math.ceil(words.length * 0.7)
  return {
    mastered,
    required,
    total: words.length,
    eligible: words.length > 0 && mastered >= required
  }
}
export function grantExamEligibility(state: {
  unlockedVocabularyLevel: number
  eligibleExamLevels: number[]
  wordProgress: Record<string, WordProgress>
}): number | undefined {
  const level = state.unlockedVocabularyLevel
  if (
    level >= lastVocabularyLevel ||
    state.eligibleExamLevels.includes(level) ||
    !examProgress(level, state.wordProgress).eligible
  )
    return
  state.eligibleExamLevels.push(level)
  return level
}
function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
export function examAnswer(question: Pick<ChoiceQuestion, 'wordId' | 'type'>) {
  const word = vocabularyWords.find((word) => word.id === question.wordId)!
  return question.type === 'en-to-ja' ? word.meaningJa : word.word
}
export function buildPromotionExam(level: number, random = Math.random): PromotionExamSession {
  const pool = vocabularyWords.filter((word) => word.level === level)
  const types = shuffle(
    Array.from({ length: EXAM_SIZE }, (_, index) =>
      index < 10 ? ('en-to-ja' as const) : ('ja-to-en' as const)
    ),
    random
  )
  const questions = shuffle(pool, random)
    .slice(0, EXAM_SIZE)
    .map((word, index): ChoiceQuestion => {
      const type = types[index]!
      const correct = examAnswer({ wordId: word.id, type })
      const alternatives = [
        ...new Set(
          pool.map((candidate) => (type === 'en-to-ja' ? candidate.meaningJa : candidate.word))
        )
      ].filter((value) => value !== correct)
      return {
        wordId: word.id,
        type,
        options: shuffle([correct, ...shuffle(alternatives, random).slice(0, 3)], random)
      }
    })
  return { id: crypto.randomUUID(), level, questions, answers: [] }
}
