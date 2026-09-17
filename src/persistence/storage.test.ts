import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaults } from './save'
import { loadSave, writeSave, SAVE_KEY, RECOVERY_KEY } from './storage'

const data = new Map<string, string>()
beforeEach(() => {
  data.clear()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value))
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('save storage', () => {
  it('loads partially damaged data without resetting the profile', () => {
    data.set(
      SAVE_KEY,
      JSON.stringify({
        version: 5,
        name: 'Keiya',
        xp: 100,
        dailyStudyStats: { '2026-09-17': null }
      })
    )
    expect(loadSave()).toMatchObject({ save: { name: 'Keiya', xp: 100 }, error: null })
  })

  it('backs up unreadable JSON before replacing it', () => {
    data.set(SAVE_KEY, '{broken')
    expect(loadSave().error).toBeNull()
    expect(data.get(RECOVERY_KEY)).toBe('{broken')
    expect(data.get(SAVE_KEY)).toBe('{broken')
    expect(writeSave(defaults())).toBeNull()
    expect(JSON.parse(data.get(SAVE_KEY)!).version).toBe(6)
    expect(data.get(RECOVERY_KEY)).toBe('{broken')
  })

  it('never overwrites unreadable data if its backup cannot be saved', () => {
    data.set(SAVE_KEY, '{broken')
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('Quota exceeded')
    })
    expect(loadSave().error).toBeTruthy()
    expect(writeSave(defaults())).toBeTruthy()
    expect(data.get(SAVE_KEY)).toBe('{broken')
  })

  it('returns a recoverable error when storage access is denied', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error('Access denied')
    })
    expect(loadSave().error).toBeTruthy()
    expect(writeSave(defaults())).toBeTruthy()
  })
})
