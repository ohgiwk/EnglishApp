// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VocabularyResultView from './VocabularyResultView.vue'
import { useAppStore } from '../stores/app'
import { vocabularyWords } from '../data/vocabulary'
import { localDateKey } from '../study-date'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  setActivePinia(createPinia())
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
function setup(count: number) {
  const store = useAppStore()
  store.s.lastVocabularyResult = {
    sessionId: 'result-test',
    level: 1,
    correctCount: count,
    totalCount: count,
    accuracy: 100,
    earnedXp: count,
    affectionChange: 0,
    trustChange: 0,
    masteredWordIds: [],
    reviewWordIds: [],
    completedAt: new Date().toISOString(),
    answers: vocabularyWords.slice(0, count).map((word) => ({
      wordId: word.id,
      type: 'en-to-ja',
      correct: true,
      answeredAt: new Date().toISOString()
    }))
  }
  return store
}
function render() {
  wrapper = mount(VocabularyResultView, {
    global: { stubs: { EmmaPortrait: true, ExamUnlockNotice: true, RouterLink: true } }
  })
  return wrapper
}
it.each([11, 50])(
  'shows the first ten of %i words and allows expanding and collapsing',
  async (count) => {
    setup(count)
    const view = render()
    expect(view.get('.result-list h2').text()).toContain(`${count}語`)
    const firstTen = view.findAll('.result-word-row').map((row) => row.text())
    expect(firstTen).toHaveLength(10)
    const toggle = view.get('.result-list-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(view.findAll('.result-word-row')).toHaveLength(count)
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(view.findAll('.result-word-row').map((row) => row.text())).toEqual(firstTen)
  }
)
it.each([0, 10])('shows %i recorded words without an unnecessary toggle', (count) => {
  setup(count)
  const view = render()
  expect(view.findAll('.result-word-row')).toHaveLength(count)
  expect(view.find('.result-list-toggle').exists()).toBe(false)
  if (count === 0) expect(view.text()).toContain('単語ごとの記録がありません')
})
it('shows current mastered and today totals in the status panel', () => {
  const store = setup(11)
  store.s.wordProgress[vocabularyWords[0].id] = {
    status: 'mastered',
    correctSessions: [],
    correctCount: 3,
    incorrectCount: 0,
    lastStudiedAt: new Date().toISOString()
  }
  const date = localDateKey(new Date())
  store.s.dailyStudyStats[date] = {
    date,
    vocabularyQuestionsAnswered: 23,
    xpEarned: 0,
    storySessions: 0,
    vocabularySessions: 2,
    questionsAnswered: 23,
    correctAnswers: 20
  }
  const panels = render().findAll('.result-study-summary > div')
  expect(panels[0].text()).toBe('1Mastered')
  expect(panels[1].text()).toBe('23Today')
})
