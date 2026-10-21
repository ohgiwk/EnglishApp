// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StatusView from './StatusView.vue'
import { useAppStore } from '../stores/app'
import { localDateKey } from '../study-date'

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  setActivePinia(createPinia())
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
it('shows daily totals and updates the detail card when another day is selected', async () => {
  const store = useAppStore()
  const today = localDateKey(new Date())
  store.s.dailyStudyStats[today] = {
    date: today,
    vocabularyQuestionsAnswered: 20,
    xpEarned: 45,
    storySessions: 2,
    vocabularySessions: 1,
    questionsAnswered: 25,
    correctAnswers: 20
  }
  wrapper = mount(StatusView, { global: { stubs: { RouterLink: true } } })
  const card = () => wrapper!.get('.day-detail')
  expect(card().get('time').attributes('datetime')).toBe(today)
  expect(card().get('.day-detail-xp').text()).toBe('+45XP')
  expect(
    card()
      .findAll('dd')
      .map((item) => item.text())
  ).toEqual(['20問', '2回'])
  const previous = new Date()
  previous.setDate(previous.getDate() - 1)
  await wrapper.get(`[aria-label="${localDateKey(previous)}の学習記録"]`).trigger('click')
  expect(card().text()).toContain('この日の学習記録はありません')
  expect(card().find('dl').exists()).toBe(false)
  store.s.dailyStudyStats[localDateKey(previous)] = {
    ...store.s.dailyStudyStats[today]!,
    date: localDateKey(previous),
    questionsAnswered: 0,
    correctAnswers: 0
  }
  await wrapper.vm.$nextTick()
  expect(card().findAll('dd')).toHaveLength(2)
  expect(card().text()).not.toContain('回答数')
  expect(card().text()).not.toContain('正答率')
})
