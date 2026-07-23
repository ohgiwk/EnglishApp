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
    store.complete({ chapterId: 1, choice })
    const first = { affection: store.s.affection, xp: store.s.xp, days: store.s.studyDays }
    store.complete({ chapterId: 1, choice })
    expect({ affection: store.s.affection, xp: store.s.xp, days: store.s.studyDays }).toEqual(first)
    expect(store.currentChapter).toBe(2)
  })

  it('adds and removes a review expression', () => {
    const store = useAppStore()
    store.toggleReview('c1-a')
    expect(store.s.reviews).toContain('c1-a')
    store.toggleReview('c1-a')
    expect(store.s.reviews).not.toContain('c1-a')
  })

  it('migrates version 1 saves without losing story progress', () => {
    const migrated = migrateSave({
      version: 1,
      name: 'Keiya',
      affection: 33,
      trust: 24,
      completed: [1, 2],
      reviews: ['c1-a'],
      answers: {}
    })
    expect(migrated.version).toBe(2)
    expect(migrated.name).toBe('Keiya')
    expect(migrated.completed).toEqual([1, 2])
    expect(migrated.wordProgress).toEqual({})
    expect(migrated.unlockedVocabularyLevel).toBe(1)
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
    const initialAffection = store.s.affection
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
    expect(store.s.affection).toBe(initialAffection + 9)
    expect(store.s.xp).toBe(120)
    expect(store.s.lastVocabularyResult?.affectionChange).toBe(0)
  })
})
