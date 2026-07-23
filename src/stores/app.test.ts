import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { migrateSave, useAppStore } from './app'
import { chapters } from '../data/chapters'
import type { VocabularySession } from '../types'

const data = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
  removeItem: (key: string) => data.delete(key),
  clear: () => data.clear()
})

describe('app store progression', () => {
  beforeEach(() => {
    data.clear()
    setActivePinia(createPinia())
  })

  it('applies chapter rewards only once', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    const first = { affection: store.progress.affection, xp: store.s.xp, days: store.s.studyDays }
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    expect({
      affection: store.progress.affection,
      xp: store.s.xp,
      days: store.s.studyDays
    }).toEqual(first)
    expect(store.currentChapter).toBe(2)
  })

  it('adds and removes a review expression', () => {
    const store = useAppStore()
    store.toggleReview('c1-a')
    expect(store.progress.reviews).toContain('c1-a')
    store.toggleReview('c1-a')
    expect(store.progress.reviews).not.toContain('c1-a')
  })

  it('migrates legacy saves into Emma progress without losing shared learning data', () => {
    const migrated = migrateSave({
      version: 2,
      name: 'Keiya',
      onboarded: true,
      affection: 33,
      trust: 24,
      completed: [1, 2],
      reviews: ['c1-a'],
      answers: {},
      xp: 80,
      wordProgress: {
        v0001: {
          status: 'learning',
          correctSessions: ['one'],
          correctCount: 1,
          incorrectCount: 0,
          lastStudiedAt: '2026-01-01'
        }
      }
    })
    expect(migrated.version).toBe(4)
    expect(migrated.name).toBe('Keiya')
    expect(migrated.activeCharacterId).toBe('emma')
    expect(migrated.characterSelectionCompleted).toBe(true)
    expect(migrated.characterProgress.emma.affection).toBe(33)
    expect(migrated.characterProgress.emma.completed).toEqual([1, 2])
    expect(migrated.characterProgress.emma.reviews).toEqual(['c1-a'])
    expect(migrated.xp).toBe(80)
    expect(migrated.wordProgress.v0001.status).toBe('learning')
    expect(migrated.unlockedVocabularyLevel).toBe(1)
    expect(migrated.lifetimeStudyStats.storySessions).toBe(2)
  })

  it('allows only published characters to become active', () => {
    const store = useAppStore()
    expect(store.selectCharacter('secret-1')).toBe(false)
    expect(store.s.activeCharacterId).toBe('emma')
    expect(store.s.characterSelectionCompleted).toBe(false)
    expect(store.selectCharacter('emma')).toBe(true)
    expect(store.s.characterSelectionCompleted).toBe(true)
    expect(store.s.onboarded).toBe(true)
  })

  it('keeps progress records independent for all character slots', () => {
    const store = useAppStore()
    store.s.characterProgress['secret-1'].affection = 72
    store.s.characterProgress['secret-1'].completed.push(1)
    expect(store.s.characterProgress.emma.affection).toBe(18)
    expect(store.s.characterProgress.emma.completed).toEqual([])
  })

  it('repairs unavailable and unknown active character IDs during migration', () => {
    const unavailable = migrateSave({
      version: 3,
      activeCharacterId: 'secret-2',
      characterSelectionCompleted: true,
      characterProgress: {
        emma: { affection: 18, trust: 12, completed: [], answers: {}, reviews: [] },
        'secret-1': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] },
        'secret-2': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] }
      }
    })
    expect(unavailable.activeCharacterId).toBe('emma')
  })

  it('backfills v3 lifetime and daily stats without assigning story dates', () => {
    const migrated = migrateSave({
      version: 3,
      activeCharacterId: 'emma',
      characterSelectionCompleted: true,
      characterProgress: {
        emma: { affection: 20, trust: 14, completed: [1, 2], answers: {}, reviews: [] },
        'secret-1': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] },
        'secret-2': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] }
      },
      vocabularyResults: [
        {
          sessionId: 'legacy-session',
          level: 1,
          correctCount: 8,
          totalCount: 10,
          accuracy: 80,
          earnedXp: 30,
          affectionChange: 3,
          trustChange: 2,
          masteredWordIds: [],
          reviewWordIds: [],
          completedAt: '2026-07-20T10:00:00.000Z'
        }
      ]
    })
    expect(migrated.lifetimeStudyStats).toEqual({
      storySessions: 2,
      vocabularySessions: 1,
      questionsAnswered: 10,
      correctAnswers: 8
    })
    expect(migrated.dailyStudyStats['2026-07-20']).toMatchObject({
      xpEarned: 30,
      storySessions: 0,
      vocabularySessions: 1,
      questionsAnswered: 10,
      correctAnswers: 8
    })
  })

  it('keeps only the newest 365 daily records in v4 saves', () => {
    const dailyStudyStats = Object.fromEntries(
      Array.from({ length: 370 }, (_, index) => {
        const date = new Date(2025, 0, 1 + index).toLocaleDateString('sv-SE')
        return [
          date,
          {
            date,
            xpEarned: 1,
            storySessions: 0,
            vocabularySessions: 1,
            questionsAnswered: 1,
            correctAnswers: 1
          }
        ]
      })
    )
    const migrated = migrateSave({
      version: 4,
      dailyStudyStats,
      lifetimeStudyStats: {
        storySessions: 0,
        vocabularySessions: 370,
        questionsAnswered: 370,
        correctAnswers: 370
      }
    })
    expect(Object.keys(migrated.dailyStudyStats)).toHaveLength(365)
    expect(Object.keys(migrated.dailyStudyStats)).not.toContain('2025-01-01')
  })

  it('masters a word after correct answers in two different sessions', () => {
    const store = useAppStore()
    const session = (id: string): VocabularySession => ({
      id,
      level: 1,
      questions: [{ wordId: 'v0001', type: 'flashcard', options: [] }],
      answers: [],
      currentIndex: 0,
      startedAt: new Date().toISOString()
    })
    store.s.activeVocabularySession = session('session-one')
    store.answerVocabularyQuestion(true)
    expect(store.s.wordProgress.v0001.status).toBe('learning')
    store.s.activeVocabularySession = session('session-two')
    store.answerVocabularyQuestion(true)
    expect(store.s.wordProgress.v0001.status).toBe('mastered')
  })

  it('caps relationship rewards after three vocabulary sessions while keeping XP', () => {
    const store = useAppStore()
    const initialAffection = store.emmaProgress.affection
    const session = (id: string): VocabularySession => ({
      id,
      level: 1,
      questions: [{ wordId: `v000${id}`, type: 'flashcard', options: [] }],
      answers: [],
      currentIndex: 0,
      startedAt: new Date().toISOString()
    })
    for (const id of ['1', '2', '3', '4']) {
      store.s.activeVocabularySession = session(id)
      store.answerVocabularyQuestion(true)
    }
    expect(store.emmaProgress.affection).toBe(initialAffection + 9)
    expect(store.s.xp).toBe(120)
    expect(store.s.lastVocabularyResult?.affectionChange).toBe(0)
    expect(store.s.lifetimeStudyStats.vocabularySessions).toBe(4)
    expect(store.s.lifetimeStudyStats.questionsAnswered).toBe(4)
    expect(store.lifetimeAccuracy).toBe(100)
    const date = new Date().toLocaleDateString('sv-SE')
    expect(store.s.dailyStudyStats[date].vocabularySessions).toBe(4)
  })

  it('records a story session only for the first chapter completion', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    expect(store.s.lifetimeStudyStats.storySessions).toBe(1)
    const date = new Date().toLocaleDateString('sv-SE')
    expect(store.s.dailyStudyStats[date].storySessions).toBe(1)
    expect(store.s.dailyStudyStats[date].xpEarned).toBe(choice.englishXp)
  })
})
