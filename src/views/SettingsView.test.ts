// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsView from './SettingsView.vue'
import { useAppStore } from '../stores/app'
import { defaults } from '../persistence/save'
import { SAVE_KEY } from '../persistence/storage'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace, back: vi.fn() }) }))
vi.mock('../speech', () => ({
  englishSpeechAvailable: () => false,
  getAmericanEnglishVoices: async () => [],
  getAmericanVoicePreference: () => '',
  setAmericanVoicePreference: vi.fn(),
  cancelEnglishSpeech: vi.fn(),
  speakAmericanEnglish: vi.fn(),
  speakAmericanEnglishAfterPause: vi.fn()
}))

let wrapper: VueWrapper
const data = new Map<string, string>()
beforeEach(() => {
  data.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => data.set(key, value))
  })
  replace.mockClear()
  setActivePinia(createPinia())
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function setup() {
  const store = useAppStore()
  store.setName('Learner')
  store.finishOnboarding()
  store.s.xp = 100
  wrapper = mount(SettingsView, { attachTo: document.body })
  await flushPromises()
  return store
}

async function openDialog() {
  await wrapper.get('.reset-button').trigger('click')
  return document.querySelector('[role="dialog"]')!
}

it('requires confirmation and lets the user cancel without changing data', async () => {
  const store = await setup()
  const before = JSON.stringify(store.s)
  const saved = localStorage.getItem(SAVE_KEY)
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  const dialog = await openDialog()
  expect(dialog.textContent).toContain('この操作は取り消せません')
  ;(dialog.querySelector('button') as HTMLButtonElement).click()
  await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(JSON.stringify(store.s)).toBe(before)
  expect(localStorage.getItem(SAVE_KEY)).toBe(saved)
  expect(replace).not.toHaveBeenCalled()
})

it('resets persisted progress after confirmation and keeps unrelated preferences', async () => {
  const store = await setup()
  localStorage.setItem('voice-preference', 'voice')
  const dialog = await openDialog()
  ;(dialog.querySelectorAll('button')[1] as HTMLButtonElement).click()
  await flushPromises()
  expect(store.s).toEqual(defaults())
  expect(store.activeExam).toBeNull()
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(defaults())
  setActivePinia(createPinia())
  expect(useAppStore().s).toEqual(defaults())
  expect(localStorage.getItem('voice-preference')).toBe('voice')
  expect(replace).toHaveBeenCalledWith('/onboarding')
})

it('keeps progress and the confirmation open when saving fails', async () => {
  const store = await setup()
  const before = JSON.stringify(store.s)
  const saved = localStorage.getItem(SAVE_KEY)
  const dialog = await openDialog()
  vi.mocked(localStorage.setItem).mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  ;(dialog.querySelectorAll('button')[1] as HTMLButtonElement).click()
  await flushPromises()
  expect(JSON.stringify(store.s)).toBe(before)
  expect(localStorage.getItem(SAVE_KEY)).toBe(saved)
  expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain(
    'リセットできませんでした'
  )
  expect(replace).not.toHaveBeenCalled()
})

it('saves independent volume settings and restores them after reopening', async () => {
  await setup()
  await wrapper.get('#speech-volume').setValue('35')
  await wrapper.get('#effects-volume').setValue('80')
  expect(localStorage.getItem('love-language-speech-volume')).toBe('35')
  expect(localStorage.getItem('love-language-effects-volume')).toBe('80')
  wrapper.unmount()
  await setup()
  expect((wrapper.get('#speech-volume').element as HTMLInputElement).value).toBe('35')
  expect((wrapper.get('#effects-volume').element as HTMLInputElement).value).toBe('80')
  expect(wrapper.text()).toContain('35%')
  expect(wrapper.text()).toContain('80%')
  await wrapper.get('#speech-volume').setValue('0')
  expect(localStorage.getItem('love-language-effects-volume')).toBe('80')
})
