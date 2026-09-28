import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './app'
import { defaults, migrateSave } from '../persistence/save'
import { vocabularyWords } from '../data/vocabulary'
import { buildPromotionExam, examAnswer, grantExamEligibility } from '../domain/promotion-exam'
import type { WordProgress } from '../types'
const data = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value)
})
function progress(count: number, level = 1): Record<string, WordProgress> {
  return Object.fromEntries(
    vocabularyWords
      .filter((word) => word.level === level)
      .slice(0, count)
      .map((word) => [
        word.id,
        {
          status: 'mastered',
          correctSessions: ['a', 'b'],
          correctCount: 2,
          incorrectCount: 0,
          lastStudiedAt: '2026-09-18'
        }
      ])
  )
}
function takeExam(correctCount: number, store = useAppStore()) {
  expect(store.startPromotionExam(store.s.unlockedVocabularyLevel)).toBe(true)
  const session = store.activeExam!
  let result = null
  for (let i = 0; i < 20; i++) {
    const q = session.questions[i]!
    const answer = examAnswer(q)
    result = store.answerPromotionExam(
      session.id,
      i,
      i < correctCount ? answer : q.options.find((option) => option !== answer)!
    )
  }
  return result!
}
describe('promotion exams', () => {
  beforeEach(() => {
    data.clear()
    setActivePinia(createPinia())
  })
  it('grants eligibility at exactly 70%, retains it after decline and does not unlock the next level', () => {
    const state = defaults()
    state.wordProgress = progress(104)
    expect(grantExamEligibility(state)).toBeUndefined()
    state.wordProgress = progress(105)
    expect(grantExamEligibility(state)).toBe(1)
    state.wordProgress = {}
    expect(grantExamEligibility(state)).toBeUndefined()
    expect(state.eligibleExamLevels).toEqual([1])
    expect(state.unlockedVocabularyLevel).toBe(1)
    state.unlockedVocabularyLevel = 6
    state.wordProgress = progress(170, 6)
    expect(grantExamEligibility(state)).toBeUndefined()
  })
  it('builds 20 unique words and balanced four-option questions without duplicate choices', () => {
    const exam = buildPromotionExam(1)
    expect(new Set(exam.questions.map((q) => q.wordId)).size).toBe(20)
    expect(exam.questions.filter((q) => q.type === 'en-to-ja')).toHaveLength(10)
    expect(exam.questions.filter((q) => q.type === 'ja-to-en')).toHaveLength(10)
    for (const q of exam.questions) {
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(examAnswer(q))
    }
  })
  it('rejects unauthorized starts and repeated answers and discards interrupted exams', () => {
    const store = useAppStore()
    expect(store.startPromotionExam(1)).toBe(false)
    store.s.eligibleExamLevels = [1, 2, 6]
    expect(store.startPromotionExam(2)).toBe(false)
    expect(store.startPromotionExam(6)).toBe(false)
    expect(store.startPromotionExam(1)).toBe(true)
    expect(store.startPromotionExam(1)).toBe(false)
    const exam = store.activeExam!
    store.answerPromotionExam(exam.id, 0, 'invalid')
    expect(exam.answers).toHaveLength(0)
    store.answerPromotionExam(exam.id, 0, examAnswer(exam.questions[0]!))
    store.answerPromotionExam(exam.id, 0, examAnswer(exam.questions[0]!))
    expect(exam.answers).toHaveLength(1)
    store.cancelPromotionExam()
    expect(store.s.examResults).toHaveLength(0)
    expect(store.s.unlockedVocabularyLevel).toBe(1)
    store.startPromotionExam(1)
    expect(store.activeExam!.id).not.toBe(exam.id)
    setActivePinia(createPinia())
    expect(useAppStore().activeExam).toBeNull()
  })
  it('fails at 17, passes at 18, allows retries and leaves regular rewards and learning intact', () => {
    const store = useAppStore()
    store.s.eligibleExamLevels = [1]
    store.s.wordProgress = { ...progress(105), ...progress(119, 2) }
    const snapshot = JSON.stringify({
      words: store.s.wordProgress,
      xp: store.s.xp,
      characters: store.s.characterProgress,
      lifetime: store.s.lifetimeStudyStats,
      daily: store.s.dailyStudyStats,
      days: store.s.studyDays
    })
    expect(takeExam(17).passed).toBe(false)
    expect(store.s.unlockedVocabularyLevel).toBe(1)
    const result = takeExam(18)
    expect(result.passed).toBe(true)
    expect(result.unlockedExamLevel).toBe(2)
    expect(store.s.unlockedVocabularyLevel).toBe(2)
    expect(store.s.passedExamLevels).toEqual([1])
    expect(store.s.eligibleExamLevels).toEqual([1, 2])
    expect(store.answerPromotionExam(result.id, 19, 'anything')).toBeNull()
    expect(store.s.examResults).toHaveLength(2)
    expect(
      JSON.stringify({
        words: store.s.wordProgress,
        xp: store.s.xp,
        characters: store.s.characterProgress,
        lifetime: store.s.lifetimeStudyStats,
        daily: store.s.dailyStudyStats,
        days: store.s.studyDays
      })
    ).toBe(snapshot)
    store.acknowledgeExamNotification(2)
    setActivePinia(createPinia())
    const loaded = useAppStore()
    expect(loaded.s.unlockedVocabularyLevel).toBe(2)
    expect(loaded.s.examResults.at(-1)).toEqual(result)
    expect(loaded.s.notifiedExamLevels).toEqual([2])
  })
  it('relocks legacy saves only once, preserving learning and qualifying only the current level', () => {
    const old = {
      ...defaults(),
      version: 6,
      unlockedVocabularyLevel: 6,
      xp: 250,
      wordProgress: { ...progress(105), ...progress(119, 2) }
    }
    const migrated = migrateSave(old)
    expect(migrated.unlockedVocabularyLevel).toBe(1)
    expect(migrated.wordProgress).toEqual(old.wordProgress)
    expect(migrated.xp).toBe(250)
    expect(migrated.examMigrationNotice).toBe(true)
    expect(migrated.eligibleExamLevels).toEqual([1])
    const next = migrateSave({
      ...migrated,
      passedExamLevels: [1],
      eligibleExamLevels: [1, 2],
      examMigrationNotice: false
    })
    expect(next.unlockedVocabularyLevel).toBe(2)
    expect(next.examMigrationNotice).toBe(false)
    expect(migrateSave({ ...next, passedExamLevels: [2, 4] }).unlockedVocabularyLevel).toBe(1)
    expect(migrateSave({ ...next, examResults: [null, {}] }).examResults).toEqual([])
  })
  it('awards the notification on practice completion once, without unlocking the next level', () => {
    const store = useAppStore()
    const words = vocabularyWords.filter((word) => word.level === 1)
    store.s.wordProgress = progress(104)
    const word = words[104]!
    store.s.wordProgress[word.id] = {
      status: 'learning',
      correctSessions: ['previous'],
      correctCount: 1,
      incorrectCount: 0,
      lastStudiedAt: ''
    }
    const question = { wordId: word.id, type: 'en-to-ja' as const, options: [word.meaningJa] }
    const session = {
      id: 'threshold',
      level: 1,
      mode: 'en-to-ja' as const,
      questions: [question],
      answers: [],
      currentIndex: 0,
      startedAt: new Date().toISOString()
    }
    store.s.activeVocabularySession = session
    expect(store.answerVocabularyQuestion(true)?.unlockedExamLevel).toBe(1)
    expect(store.s.unlockedVocabularyLevel).toBe(1)
    store.s.activeVocabularySession = { ...session, id: 'again', answers: [], currentIndex: 0 }
    expect(store.answerVocabularyQuestion(true)?.unlockedExamLevel).toBeUndefined()
  })
  it('caps history at 30 results while retaining completed promotions', () => {
    const store = useAppStore()
    store.s.eligibleExamLevels = [1]
    for (let i = 0; i < 31; i++) takeExam(0)
    expect(store.s.examResults).toHaveLength(30)
    takeExam(20)
    expect(store.s.examResults).toHaveLength(30)
    expect(store.s.passedExamLevels).toEqual([1])
  })
})
