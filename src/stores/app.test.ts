import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './app'
import { chapters } from '../data/chapters'

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
})
