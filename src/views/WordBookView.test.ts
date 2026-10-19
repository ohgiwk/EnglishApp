// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import WordBookView from './WordBookView.vue'
import { useAppStore } from '../stores/app'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import * as vocabularyAccess from '../domain/vocabulary-access'

vi.mock('../speech', () => ({
  englishSpeechAvailable: () => false,
  cancelEnglishSpeech: vi.fn(),
  speakAmericanEnglish: vi.fn(),
  speakAmericanEnglishAfterPause: vi.fn()
}))
let wrapper: VueWrapper
let onIntersection: IntersectionObserverCallback
const disconnect = vi.fn()
async function intersect(isIntersecting = true) {
  onIntersection([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
  await nextTick()
}
beforeEach(() => {
  disconnect.mockClear()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        onIntersection = callback
      }
      observe = vi.fn()
      disconnect = disconnect
    }
  )
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value)
  })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function setup(unlocked = 1) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  store.s.unlockedVocabularyLevel = unlocked
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: WordBookView }]
  })
  await router.push('/')
  wrapper = mount(WordBookView, { global: { plugins: [pinia, router] } })
  return store
}
it('prevents viewing or searching locked vocabulary', async () => {
  vi.spyOn(vocabularyAccess, 'accessibleVocabularyLevel').mockImplementation((level) => level)
  await setup()
  const tabs = wrapper.findAll('[role="tab"]')
  expect(tabs).toHaveLength(6)
  expect(tabs[1]!.attributes('disabled')).toBeDefined()
  await tabs[1]!.trigger('click')
  expect(tabs[0]!.attributes('aria-selected')).toBe('true')
  const lockedWord = vocabularyWords.find((word) => word.level === 2)!
  await wrapper.get('input').setValue(lockedWord.word)
  expect(
    wrapper.findAll('.word-list button').some((row) => row.find('b').text() === lockedWord.word)
  ).toBe(false)
  expect(wrapper.findAll('.word-list em').every((row) => row.text() === 'Lv.1')).toBe(true)
  expect(wrapper.get('h1').text()).toBe(`${vocabularyLevels[0].wordCount.toLocaleString()} Words`)
})
it('switches unlocked levels, resets pagination and supports keyboard tabs', async () => {
  vi.spyOn(vocabularyAccess, 'accessibleVocabularyLevel').mockImplementation((level) => level)
  await setup(2)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(120)
  await wrapper.get('#word-level-2').trigger('click')
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  expect(wrapper.findAll('.word-list em').every((row) => row.text() === 'Lv.2')).toBe(true)
  expect(wrapper.get('#word-level-2').attributes('aria-selected')).toBe('true')
  await wrapper.get('#word-level-2').trigger('keydown', { key: 'ArrowRight' })
  expect(wrapper.get('#word-level-1').attributes('aria-selected')).toBe('true')
  expect(wrapper.get('#word-level-3').attributes('disabled')).toBeDefined()
})

it('temporarily opens all levels without changing promotion progress', async () => {
  const store = await setup()
  expect(
    wrapper.findAll('[role="tab"]').every((tab) => tab.attributes('disabled') === undefined)
  ).toBe(true)
  await wrapper.get('#word-level-6').trigger('click')
  expect(wrapper.findAll('.word-list em').every((row) => row.text() === 'Lv.6')).toBe(true)
  store.startVocabularySession(6)
  expect(store.s.activeVocabularySession?.level).toBe(6)
  expect(store.s.unlockedVocabularyLevel).toBe(1)
  expect(store.s.passedExamLevels).toEqual([])
})

it('loads more only near the end and stops observing after the last word', async () => {
  await setup()
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  expect(wrapper.find('.load-more').exists()).toBe(false)
  await intersect(false)
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(120)
  for (let loaded = 120; loaded < vocabularyLevels[0].wordCount; loaded += 60) {
    await intersect()
    expect(wrapper.findAll('.word-list button')).toHaveLength(
      Math.min(loaded + 60, vocabularyLevels[0].wordCount)
    )
  }
  expect(wrapper.find('.word-load-trigger').exists()).toBe(false)
  expect(disconnect).toHaveBeenCalled()
  await wrapper.get('input').setValue('the')
  await wrapper.get('input').setValue('')
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  expect(wrapper.find('.word-load-trigger').exists()).toBe(true)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(120)
})

it.each([1, 2, 3, 4, 5, 6])('searches and filters learning status in level %i', async (level) => {
  const store = await setup()
  const word = vocabularyWords.find((word) => word.level === level)!
  store.s.wordProgress[word.id] = {
    status: 'mastered',
    correctSessions: ['a', 'b'],
    correctCount: 2,
    incorrectCount: 0,
    lastStudiedAt: '2026-09-30T00:00:00.000Z'
  }
  await wrapper.get(`#word-level-${level}`).trigger('click')
  await wrapper.get('input').setValue(word.word.toUpperCase())
  await wrapper.get('select[aria-label="品詞"]').setValue(word.partOfSpeech)
  await wrapper.get('select[aria-label="学習状態"]').setValue('mastered')
  expect(wrapper.findAll('.word-list button')).toHaveLength(1)
  expect(wrapper.get('.word-list b').text()).toBe(word.word)
  await wrapper.get('select[aria-label="学習状態"]').setValue('new')
  expect(wrapper.findAll('.word-list b').some((item) => item.text() === word.word)).toBe(false)
})

it('finds capitalized headwords and shows additional meanings', async () => {
  await setup()
  await wrapper.get('input').setValue('i')
  while (wrapper.find('.word-load-trigger').exists()) await intersect()
  expect(wrapper.findAll('.word-list b').some((item) => item.text() === 'I')).toBe(true)
  await wrapper.get('#word-level-2').trigger('click')
  await wrapper.get('input').setValue('address')
  await wrapper.get('.word-list button').trigger('click')
  expect(document.querySelector('[aria-label="ほかの重要な意味"]')?.textContent).toContain(
    '対処する、取り組む'
  )
  expect(document.querySelector('.word-modal')?.textContent).toContain(
    'We must address this problem together.'
  )
})

it.each(['gay', 'staff', 'March'])(
  'shows the usage note for %s while keeping its alternate meanings',
  async (head) => {
    await setup()
    const word = vocabularyWords.find((word) => word.word === head)!
    await wrapper.get(`#word-level-${word.level}`).trigger('click')
    await wrapper.get('input').setValue(head.toLowerCase())
    await wrapper.get('.word-list button').trigger('click')
    const dialog = document.querySelector('.word-modal')!
    expect(dialog.textContent).toContain(word.usageNote)
    expect(dialog.querySelector('h2')?.textContent).toBe(word.meaningJa)
    expect(dialog.querySelector('[aria-label="ほかの重要な意味"]')?.textContent).toContain(
      word.additionalMeanings![0].meaningJa
    )
  }
)
