// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import WordBookView from './WordBookView.vue'
import { useAppStore } from '../stores/app'
import { vocabularyWords } from '../data/vocabulary'

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
  expect(wrapper.get('h1').text()).toBe('150 Words')
})
it('switches unlocked levels, resets pagination and supports keyboard tabs', async () => {
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

it('loads more only near the end and stops observing after the last word', async () => {
  await setup()
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  expect(wrapper.find('.load-more').exists()).toBe(false)
  await intersect(false)
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(120)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(150)
  expect(wrapper.find('.word-load-trigger').exists()).toBe(false)
  expect(disconnect).toHaveBeenCalled()
  await wrapper.get('input').setValue('the')
  await wrapper.get('input').setValue('')
  expect(wrapper.findAll('.word-list button')).toHaveLength(60)
  expect(wrapper.find('.word-load-trigger').exists()).toBe(true)
  await intersect()
  expect(wrapper.findAll('.word-list button')).toHaveLength(120)
})
