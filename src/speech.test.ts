// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SpeechPlaybackIcon from './components/SpeechPlaybackIcon.vue'
import { speechPlayback } from './speech-playback'
import {
  prepareEnglishSpeech,
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
  it('unlocks first delayed speech synchronously even before voices are ready', async () => {
    let inUserAction = true
    let unlocked = false
    const played: string[] = []
    synthesis.getVoices.mockReturnValue([])
    synthesis.speak.mockImplementation((utterance: SpeechSynthesisUtterance) => {
      if (inUserAction) unlocked = true
      if (unlocked && utterance.volume > 0) played.push(utterance.text)
    })
    prepareEnglishSpeech()
    expect(synthesis.speak).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ volume: 0, lang: 'en-US' })
    )
    expect(speechPlayback.value).toBeNull()
    inUserAction = false
    speakAmericanEnglishAfterPause('First word')
    await vi.advanceTimersByTimeAsync(180)
    expect(played).toEqual([])
    synthesis.getVoices.mockReturnValue([voice])
    synthesis.dispatchEvent(new Event('voiceschanged'))
    await vi.advanceTimersByTimeAsync(0)
    expect(played).toEqual(['First word'])
  })

  it('allows lesson startup when speech is unsupported or throws', () => {
    synthesis.speak.mockImplementation(() => {
      throw new Error('Unavailable')
    })
    expect(() => prepareEnglishSpeech()).not.toThrow()
    vi.stubGlobal('window', {})
    expect(() => prepareEnglishSpeech()).not.toThrow()
  })

  it('applies saved speech volume including silence', async () => {
    localStorage.setItem('love-language-speech-volume', '35')
    await speakAmericanEnglish('Hello')
    expect(synthesis.speak.mock.calls.at(-1)![0].volume).toBe(0.35)
    localStorage.setItem('love-language-speech-volume', '0')
    await speakAmericanEnglish('Hello')
    expect(synthesis.speak.mock.calls.at(-1)![0].volume).toBe(0)
  })

  it('shows loading and animated playback only for the matching text, then clears on end', async () => {
    const icon = mount(SpeechPlaybackIcon, { props: { text: 'Hello' } })
    const other = mount(SpeechPlaybackIcon, { props: { text: 'Other' } })
    const pending = speakAmericanEnglish('Hello')
    await nextTick()
    expect(icon.classes()).toContain('loading')
    expect(other.classes()).not.toContain('loading')
    await pending
    const utterance = synthesis.speak.mock.calls.at(-1)![0]
    utterance.onstart()
    await nextTick()
    expect(icon.attributes('aria-label')).toBe('再生中')
    expect(icon.find('.speech-wave').exists()).toBe(true)
    utterance.onend()
    await nextTick()
    expect(icon.find('.speech-wave').exists()).toBe(false)
    expect(speechPlayback.value).toBeNull()
    icon.unmount()
    other.unmount()
  })

  it('ignores stale playback events and clears on cancellation and failure', async () => {
    await speakAmericanEnglish('Old')
    const old = synthesis.speak.mock.calls.at(-1)![0]
    await speakAmericanEnglish('New')
    const current = synthesis.speak.mock.calls.at(-1)![0]
    current.onstart()
    old.onend()
    expect(speechPlayback.value).toMatchObject({ text: 'New', phase: 'playing' })
    current.onerror()
    expect(speechPlayback.value).toBeNull()
    await speakAmericanEnglish('Canceled')
    const canceled = synthesis.speak.mock.calls.at(-1)![0]
    cancelEnglishSpeech()
    canceled.onstart()
    expect(speechPlayback.value).toBeNull()
    synthesis.speak.mockImplementation(() => {
      throw new Error('Unavailable')
    })
    await speakAmericanEnglish('Blocked')
    expect(speechPlayback.value).toBeNull()
  })

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
