// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { nextTick } from 'vue'
import VocabularySessionView from './VocabularySessionView.vue'
import LearnView from './LearnView.vue'
import VocabularyResultView from './VocabularyResultView.vue'
import { useAppStore } from '../stores/app'
import { buildFillBlank, buildReorder } from '../data/vocabulary-engine'
import { vocabularyWords } from '../data/vocabulary'
import type {
  FillBlankQuestion,
  ReorderQuestion,
  VocabularyQuestion,
  VocabularySession
} from '../types'
import {
  cancelEnglishSpeech,
  speakAmericanEnglish,
  speakAmericanEnglishAfterPause
} from '../speech'

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
  vi.clearAllMocks()
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  await nextTick()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const word = vocabularyWords.find((word) => word.word === 'do')!
const fill = (): FillBlankQuestion => ({
  wordId: word.id,
  type: 'fill-blank',
  options: [],
  ...buildFillBlank(word)
})
const reorder = (): ReorderQuestion => ({
  wordId: word.id,
  type: 'reorder',
  options: [],
  ...buildReorder(word, () => 0.42)
})
const session = (questions: VocabularyQuestion[]): VocabularySession => ({
  id: 'ui-session',
  level: 1,
  mode: 'mixed',
  questions,
  answers: [],
  currentIndex: 0,
  startedAt: new Date().toISOString()
})
async function setup(questions: VocabularyQuestion[], path = '/learn/session/1') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  store.s.activeVocabularySession = session(questions)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/learn/session/:level', component: VocabularySessionView },
      { path: '/learn', component: LearnView },
      { path: '/learn/result', component: VocabularyResultView }
    ]
  })
  await router.push(path)
  await router.isReady()
  const host = document.createElement('div')
  document.body.append(host)
  wrapper = mount(RouterView, { attachTo: host, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { store, router }
}
async function clickButton(text: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text)
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  button.click()
  await flushPromises()
}

describe('vocabulary session UI', () => {
  it.each([true, false])(
    'speaks the completed fill sentence after grading (%s), and records only on Next',
    async (correct) => {
      const question = fill()
      const { store } = await setup([question])
      expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
      expect(document.querySelector('[aria-label="単語を再生"]')).toBeNull()
      expect(wrapper!.text()).toContain(question.promptJa)
      await wrapper!.get('input').setValue(correct ? question.answer : 'incorrect')
      await wrapper!.get('form').trigger('submit')
      await flushPromises()
      expect(speakAmericanEnglish).toHaveBeenCalledExactlyOnceWith(question.sentence)
      expect(store.s.activeVocabularySession?.answers).toHaveLength(0)
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        correct ? '正解！' : 'おしい！'
      )
      await clickButton('英文の発音')
      expect(speakAmericanEnglish).toHaveBeenCalledTimes(2)
      await clickButton('次の問題へ')
      expect(store.s.lastVocabularyResult?.answers?.[0].correct).toBe(correct)
    }
  )

  it('accepts identical reorder tokens, speaks the sentence, and exposes replay only in the result', async () => {
    const question = reorder()
    await setup([question])
    expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
    expect(document.querySelector('[aria-label="単語を再生"]')).toBeNull()
    const order = [...question.correctOrder]
    const duplicates = question.tokens.filter((token) => token.text === 'do')
    const a = order.indexOf(duplicates[0].id),
      b = order.indexOf(duplicates[1].id)
    ;[order[a], order[b]] = [order[b], order[a]]
    for (const id of order) {
      const text = question.tokens.find((token) => token.id === id)!.text
      const candidates = wrapper!
        .findAll('.token-bank button')
        .filter((button) => button.text() === text)
      await candidates.at(-1)!.trigger('click')
    }
    await clickButton('答え合わせ')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('正解！')
    expect(speakAmericanEnglish).toHaveBeenCalledExactlyOnceWith(question.prompt)
    await clickButton('英文の発音')
    expect(speakAmericanEnglish).toHaveBeenCalledTimes(2)
  })

  it('mutes automatic answer speech but permits explicit replay', async () => {
    await setup([fill()])
    await wrapper!.get('[aria-label="自動読み上げと効果音をミュートする"]').trigger('click')
    await wrapper!.get('input').setValue('do')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(speakAmericanEnglish).not.toHaveBeenCalled()
    await clickButton('英文の発音')
    expect(speakAmericanEnglish).toHaveBeenCalledExactlyOnceWith(fill().sentence)
  })

  it('keeps the next sentence question silent and resets the input', async () => {
    const secondWord = vocabularyWords.find((word) => word.word === 'day')!
    const second: FillBlankQuestion = {
      wordId: secondWord.id,
      type: 'fill-blank',
      options: [],
      ...buildFillBlank(secondWord)
    }
    await setup([fill(), second])
    await wrapper!.get('input').setValue('do')
    await wrapper!.get('form').trigger('submit')
    await clickButton('次の問題へ')
    expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
    expect((wrapper!.get('input').element as HTMLInputElement).value).toBe('')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper!.text()).toContain(second.prompt)
  })

  it('retains question audio and immediate self-rating for flashcards', async () => {
    const { store } = await setup([{ wordId: word.id, type: 'flashcard', options: [] }])
    expect(speakAmericanEnglishAfterPause).toHaveBeenCalledExactlyOnceWith(word.word)
    await clickButton('答えを見る')
    expect(store.s.activeVocabularySession?.answers).toHaveLength(0)
    await clickButton('覚えていた')
    expect(store.s.lastVocabularyResult?.correctCount).toBe(1)
  })

  it('handles cancel and confirm in the leave dialog and stops speech on departure', async () => {
    const { router, store } = await setup([fill()])
    await wrapper!.get('[aria-label="学習を閉じる"]').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('学習を中断しますか？')
    await clickButton('学習を続ける')
    expect(router.currentRoute.value.path).toBe('/learn/session/1')
    const before = vi.mocked(cancelEnglishSpeech).mock.calls.length
    await wrapper!.get('[aria-label="学習を閉じる"]').trigger('click')
    await flushPromises()
    await clickButton('中断して戻る')
    expect(router.currentRoute.value.path).toBe('/learn')
    expect(store.s.activeVocabularySession).toBeNull()
    expect(vi.mocked(cancelEnglishSpeech).mock.calls.length).toBeGreaterThan(before)
  })

  it('does not restore the removed start-page autoplay when beginning a session', async () => {
    const { store } = await setup([fill()], '/learn')
    vi.spyOn(store, 'startVocabularySession').mockImplementation(() => {
      store.s.activeVocabularySession = session([fill()])
    })
    const startButton = wrapper!
      .findAll('button')
      .find((button) => button.text().includes('をスタート'))
    if (!startButton) throw new Error('Start button not found')
    await startButton.trigger('click')
    await flushPromises()
    expect(document.querySelector('input#fill-answer')).not.toBeNull()
    expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
  })

  it('keeps sentence autoplay disabled when retrying from the results screen', async () => {
    const { store } = await setup([fill()])
    await wrapper!.get('input').setValue('do')
    await wrapper!.get('form').trigger('submit')
    await clickButton('次の問題へ')
    vi.spyOn(store, 'startVocabularySession').mockImplementation(() => {
      store.s.activeVocabularySession = session([reorder()])
    })
    vi.clearAllMocks()
    await clickButton('同じモードでもう一度')
    expect(document.querySelector('.reorder-exercise')).not.toBeNull()
    expect(speakAmericanEnglishAfterPause).not.toHaveBeenCalled()
    expect(speakAmericanEnglish).not.toHaveBeenCalled()
  })
})
