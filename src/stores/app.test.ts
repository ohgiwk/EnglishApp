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
  beforeEach(() => { data.clear(); setActivePinia(createPinia()) })

  it('applies chapter rewards only once', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    const first = { affection: store.progress.affection, xp: store.s.xp, days: store.s.studyDays }
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    expect({ affection: store.progress.affection, xp: store.s.xp, days: store.s.studyDays }).toEqual(first)
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
    expect(migrated.version).toBe(3)
    expect(migrated.name).toBe('Keiya')
    expect(migrated.activeCharacterId).toBe('emma')
    expect(migrated.characterSelectionCompleted).toBe(true)
    expect(migrated.characterProgress.emma.affection).toBe(33)
    expect(migrated.characterProgress.emma.completed).toEqual([1, 2])
    expect(migrated.characterProgress.emma.reviews).toEqual(['c1-a'])
    expect(migrated.xp).toBe(80)
    expect(migrated.wordProgress.v0001.status).toBe('learning')
    expect(migrated.unlockedVocabularyLevel).toBe(1)
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
  })
})
