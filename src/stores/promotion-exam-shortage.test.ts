import { expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './app'
import { vocabularyWords } from '../data/vocabulary'
import { buildPromotionExam, grantExamEligibility } from '../domain/promotion-exam'

// Keep the incomplete-catalog case independent of future vocabulary additions.
vi.mock('../data/vocabulary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/vocabulary')>()
  const retained = new Set(
    actual.vocabularyWords
      .filter((word) => word.level === 5)
      .slice(0, 19)
      .map((word) => word.id)
  )
  const words = actual.vocabularyWords.filter((word) => word.level !== 5 || retained.has(word.id))
  return {
    ...actual,
    vocabularyWords: words,
    vocabularyLevels: actual.vocabularyLevels.map((level) => ({
      ...level,
      wordCount: words.filter((word) => word.level === level.id).length
    }))
  }
})

it('does not start an incomplete exam and preserves previously earned eligibility', () => {
  setActivePinia(createPinia())
  const store = useAppStore()
  store.s.unlockedVocabularyLevel = 5
  store.s.eligibleExamLevels = [5]
  store.s.wordProgress = Object.fromEntries(
    vocabularyWords
      .filter((word) => word.level === 5)
      .map((word) => [
        word.id,
        {
          status: 'mastered',
          correctSessions: ['a', 'b'],
          correctCount: 2,
          incorrectCount: 0,
          lastStudiedAt: '2026-10-02'
        }
      ])
  )
  expect(vocabularyWords.filter((word) => word.level === 5)).toHaveLength(19)
  expect(store.canTakeExam(5)).toBe(false)
  expect(store.startPromotionExam(5)).toBe(false)
  expect(store.activeExam).toBeNull()
  expect(store.s.eligibleExamLevels).toEqual([5])
  expect(() => buildPromotionExam(5)).toThrow('Not enough words')
  store.s.eligibleExamLevels = []
  expect(grantExamEligibility(store.s)).toBeUndefined()
})
