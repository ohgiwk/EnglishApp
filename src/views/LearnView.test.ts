// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LearnView from './LearnView.vue'
import { useAppStore } from '../stores/app'
import { vocabularyWords } from '../data/vocabulary'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

it('shows actual question counts when a level or status filter has fewer eligible words', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  store.s.unlockedVocabularyLevel = 4
  store.setVocabularyQuestionCount(50)
  const eligibleWords = vocabularyWords.filter((word) => word.level === 4).slice(0, 16)
  for (const word of eligibleWords) {
    store.s.wordProgress[word.id] = {
      status: 'learning',
      correctSessions: [],
      correctCount: 1,
      incorrectCount: 0,
      lastStudiedAt: '2026-10-01T00:00:00.000Z'
    }
  }
  store.setVocabularyStatuses(['learning'])
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LearnView }]
  })
  await router.push('/?level=4')
  wrapper = mount(LearnView, {
    global: { plugins: [pinia, router], stubs: { EmmaPortrait: true } }
  })
  const count = eligibleWords.length
  expect(count).toBeLessThan(50)
  expect(wrapper.text()).toContain('大学受験向けに語彙を拡充中です。')
  expect(wrapper.text()).not.toContain('レベルは一部見直し中です。')
  expect(wrapper.get('.available-count-note').text()).toContain(`${count}問で出題`)
  expect(wrapper.text()).toContain(`対象：${count}語`)
  expect(wrapper.get('.learn-hero button small').text()).toContain(`${count}問`)
  await wrapper.get('input[name="question-count"][value="20"]').setValue()
  expect(wrapper.find('.available-count-note').exists()).toBe(count < 20)
  await wrapper.get('input[name="question-count"][value="10"]').setValue()
  expect(wrapper.find('.available-count-note').exists()).toBe(false)
  await wrapper.get('input[name="question-count"][value="all"]').setValue()
  expect(wrapper.find('.available-count-note').exists()).toBe(false)
  store.setVocabularyStatuses(['mastered'])
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('対象：0語')
  expect(wrapper.get('.learn-hero button').attributes('disabled')).toBeDefined()
})

it('starts from the selected level with no unit selector, ignoring legacy unit URLs', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: LearnView },
      { path: '/learn/session/:level', component: { template: '<div />' } }
    ]
  })
  await router.push('/?level=1&unit=17')
  wrapper = mount(LearnView, {
    global: { plugins: [pinia, router], stubs: { EmmaPortrait: true } }
  })
  expect(wrapper.find('select[aria-label="学習単元"]').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('学習する範囲を選ぶ')
  await wrapper.get('input[name="question-count"][value="all"]').setValue()
  await wrapper.get('.learn-hero button').trigger('click')
  const expected = vocabularyWords.filter((word) => word.level === 1)
  expect(
    new Set(store.s.activeVocabularySession?.questions.map((question) => question.wordId))
  ).toEqual(new Set(expected.map((word) => word.id)))
  expect(store.s.activeVocabularySession?.unitNumber).toBeUndefined()
})
