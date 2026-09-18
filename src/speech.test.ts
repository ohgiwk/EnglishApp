// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import {
  cancelEnglishSpeech,
  setAmericanVoicePreference,
  speakAmericanEnglish,
  speakAmericanEnglishAfterPause
} from './speech'
import { useEnglishSpeech } from './composables/useEnglishSpeech'

const voice = {
  lang: 'en-US',
  name: 'Google US English',
  voiceURI: 'google-us',
  localService: true,
  default: true
} as SpeechSynthesisVoice
let synthesis: EventTarget & {
  getVoices: ReturnType<typeof vi.fn>
  speak: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
}
beforeEach(() => {
  vi.useFakeTimers()
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key)
  })
  synthesis = Object.assign(new EventTarget(), {
    getVoices: vi.fn(() => [voice]),
    speak: vi.fn(),
    cancel: vi.fn()
  })
  vi.stubGlobal('speechSynthesis', synthesis)
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    }
  )
  setAmericanVoicePreference('')
})
afterEach(() => {
  cancelEnglishSpeech()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('speech lifecycle', () => {
  it('plays only the latest delayed request', async () => {
    speakAmericanEnglishAfterPause('old')
    speakAmericanEnglishAfterPause('new')
    await vi.advanceTimersByTimeAsync(180)
    expect(synthesis.speak).toHaveBeenCalledOnce()
    expect(synthesis.speak.mock.calls[0][0].text).toBe('new')
  })

  it('cancels pending and active audio when its view scope is disposed', async () => {
    const scope = effectScope()
    const speech = scope.run(() => useEnglishSpeech())!
    speech.speakAfterPause('pending')
    scope.stop()
    await vi.advanceTimersByTimeAsync(180)
    expect(synthesis.speak).not.toHaveBeenCalled()
    const activeScope = effectScope()
    const activeSpeech = activeScope.run(() => useEnglishSpeech())!
    await activeSpeech.speak('active')
    const count = synthesis.cancel.mock.calls.length
    activeScope.stop()
    expect(synthesis.cancel.mock.calls.length).toBeGreaterThan(count)
  })

  it('does not speak after cancellation while waiting for voices', async () => {
    synthesis.getVoices.mockReturnValue([])
    const pending = speakAmericanEnglish('stale')
    cancelEnglishSpeech()
    synthesis.getVoices.mockReturnValue([voice])
    synthesis.dispatchEvent(new Event('voiceschanged'))
    await pending
    expect(synthesis.speak).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses the saved voice for explicit replay', async () => {
    const other = { ...voice, name: 'Allison', voiceURI: 'allison' }
    synthesis.getVoices.mockReturnValue([voice, other])
    setAmericanVoicePreference('allison')
    await speakAmericanEnglish('Hello')
    expect(synthesis.speak.mock.calls[0][0]).toMatchObject({
      text: 'Hello',
      voice: other,
      lang: 'en-US'
    })
  })
})
