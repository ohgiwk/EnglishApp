// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { nextTick } from 'vue'
import PromotionExamView from './PromotionExamView.vue'
import PromotionExamResultView from './PromotionExamResultView.vue'
import VocabularyResultView from './VocabularyResultView.vue'
import LearnView from './LearnView.vue'
import { useAppStore } from '../stores/app'
import { examAnswer } from '../domain/promotion-exam'
import { speakAmericanEnglish, speakAmericanEnglishAfterPause } from '../speech'
vi.mock('../speech', () => ({
  cancelEnglishSpeech: vi.fn(),
  speakAmericanEnglish: vi.fn(),
  speakAmericanEnglishAfterPause: vi.fn()
}))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value)
  })
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.clearAllMocks()
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  await nextTick()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.unstubAllGlobals()
})
async function setup(path = '/learn/exam/1', eligible = true) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  if (eligible) store.s.eligibleExamLevels = [1]
  store.s.lastVocabularyResult = {
    sessionId: 'practice',
    level: 1,
    totalCount: 10,
    correctCount: 10,
    accuracy: 100,
    earnedXp: 10,
    affectionChange: 0,
    trustChange: 0,
    masteredWordIds: [],
    reviewWordIds: [],
    completedAt: new Date().toISOString(),
    unlockedExamLevel: 1
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/learn/exam/:level', component: PromotionExamView },
      { path: '/learn/exam-result', component: PromotionExamResultView },
      { path: '/learn/result', component: VocabularyResultView },
      { path: '/learn', component: LearnView }
    ]
  })
  await router.push(path)
  await router.isReady()
  wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { store, router }
}
async function click(text: string) {
  const button = wrapper!.findAll('button').find((button) => button.text().includes(text))!
  expect(button).toBeDefined()
  await button.trigger('click')
  await flushPromises()
}
describe('promotion exam screens', () => {
  it('redirects unauthorized direct links to Learn', async () => {
    const { router, store } = await setup('/learn/exam/2')
    expect(router.currentRoute.value.path).toBe('/learn')
    expect(store.activeExam).toBeNull()
    expect(wrapper!.text()).not.toContain('次のレベルへの昇級')
    expect(wrapper!.text()).not.toContain('20問中18問以上')
    const info = wrapper!.get('[aria-label="昇級条件を確認する"]')
    ;(info.element as HTMLButtonElement).focus()
    await info.trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('20問中18問以上')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('70%以上')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(info.element)
  })
  it('withholds feedback and speech until completion, then displays answers and manual playback', async () => {
    const { store, router } = await setup()
    expect(wrapper!.text()).toContain('中断・再読み込み')
    await click('試験を開始する')
    for (let index = 0; index < 20; index++) {
      const q = store.activeExam!.questions[index]!
      const choice = wrapper!
        .findAll('.vocab-options button')
        .find((button) => button.text() === examAnswer(q))!
      await choice.trigger('click')
      expect(wrapper!.find('[role="dialog"]').exists()).toBe(false)
      expect(wrapper!.find('.vocab-options .correct').exists()).toBe(false)
      expect(wrapper!.findAll('button').some((button) => button.text().includes('発音'))).toBe(
        false
      )
      await click('回答を確定して')
    }
    expect(router.currentRoute.value.path).toBe('/learn/exam-result')
    expect(wrapper!.text()).toContain('昇級試験 合格！')
    expect(wrapper!.text()).toContain('20 / 20 問正解')
    expect(wrapper!.findAll('button')).toHaveLength(20)
    expect(speakAmericanEnglish).not.toHaveBeenCalled()
    expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
    await click('発音を聞く')
    expect(speakAmericanEnglish).toHaveBeenCalledTimes(1)
    await wrapper!.get('a.primary').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.level).toBe('2')
    expect(wrapper!.get('.level-select-trigger').text()).toContain('LEVEL 2')
  })
  it('confirms interruption and preserves neither results nor promotion', async () => {
    const { store, router } = await setup()
    await click('試験を開始する')
    await wrapper!.get('a.text-link').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('試験を中断しますか')
    const buttons = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
    buttons()
      .find((button) => button.textContent?.includes('試験を続ける'))!
      .click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/learn/exam/1')
    await wrapper!.get('a.text-link').trigger('click')
    await flushPromises()
    buttons()
      .find((button) => button.textContent === '中断する')!
      .click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/learn')
    expect(store.activeExam).toBeNull()
    expect(store.s.examResults).toHaveLength(0)
  })
  it('shows the unlock dialog once and keeps the card and exam link after dismissal', async () => {
    const { store, router } = await setup('/learn/result')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      '昇級試験が解放されました'
    )
    expect(store.s.notifiedExamLevels).toEqual([1])
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent === 'あとで')!
      .click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper!.text()).toContain('昇級試験が解放されました')
    await router.push('/learn')
    await router.push('/learn/result')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const link = wrapper!.findAll('a').find((link) => link.text() === '試験を受ける')!
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/learn/exam/1')
  })
})
