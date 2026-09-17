const normalizedLanguage = (voice: SpeechSynthesisVoice) =>
  voice.lang.toLowerCase().replace('_', '-')

const supportedAmericanVoice = (voice: SpeechSynthesisVoice) =>
  normalizedLanguage(voice) === 'en-us' && !/christopher|jenny|samantha/i.test(voice.name)

const isIPhoneFamily = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const VOICE_KEY = 'love-language-american-voice'

const savedVoiceId = () => {
  try {
    return localStorage.getItem(VOICE_KEY) ?? ''
  } catch {
    return ''
  }
}

const preferredAmericanVoice = (voices: SpeechSynthesisVoice[]) => {
  const allAmericanVoices = voices.filter((voice) => normalizedLanguage(voice) === 'en-us')
  const americanVoices = allAmericanVoices.filter(supportedAmericanVoice)
  const preference = savedVoiceId()
  const saved = americanVoices.find(
    (voice) => voice.voiceURI === preference || voice.name === preference
  )
  if (saved) return saved
  if (!preference && isIPhoneFamily()) {
    const samantha = allAmericanVoices.find((voice) => /samantha/i.test(voice.name))
    if (samantha) return samantha
  }
  const priorities = [
    /google us english/i,
    /microsoft.*(aria|guy)/i,
    /^allison/i,
    /^ava/i
  ]
  for (const pattern of priorities) {
    const voice = americanVoices.find((candidate) => pattern.test(candidate.name))
    if (voice) return voice
  }
  if (americanVoices[0]) return americanVoices[0]
  if (isIPhoneFamily()) return allAmericanVoices.find((voice) => /samantha/i.test(voice.name)) ?? null
  return null
}

let pendingSpeech: ReturnType<typeof setTimeout> | null = null
let speechRequest = 0
let selectedAmericanVoice: SpeechSynthesisVoice | null = null

export const englishSpeechAvailable = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

export const getAmericanVoicePreference = () => savedVoiceId()

export function setAmericanVoicePreference(voiceId: string) {
  try {
    if (voiceId) localStorage.setItem(VOICE_KEY, voiceId)
    else localStorage.removeItem(VOICE_KEY)
  } catch {
    // The browser may block storage in private contexts; the default voice remains available.
  }
  selectedAmericanVoice = null
  cancelEnglishSpeech()
}

async function waitForAmericanVoice() {
  if (selectedAmericanVoice) return selectedAmericanVoice
  const synthesis = window.speechSynthesis
  const available = preferredAmericanVoice(synthesis.getVoices())
  if (available) {
    selectedAmericanVoice = available
    return available
  }

  return new Promise<SpeechSynthesisVoice | null>((resolve) => {
    let settled = false
    const finish = (voice: SpeechSynthesisVoice | null) => {
      if (settled) return
      settled = true
      synthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      if (voice) selectedAmericanVoice = voice
      resolve(selectedAmericanVoice)
    }
    const handleVoicesChanged = () => {
      const voice = preferredAmericanVoice(synthesis.getVoices())
      if (voice) finish(voice)
    }
    synthesis.addEventListener('voiceschanged', handleVoicesChanged)
    setTimeout(() => finish(preferredAmericanVoice(synthesis.getVoices())), 1500)
  })
}

export async function getAmericanEnglishVoices() {
  if (!englishSpeechAvailable()) return []
  await waitForAmericanVoice()
  return window.speechSynthesis
    .getVoices()
    .filter(supportedAmericanVoice)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function speakAmericanEnglish(text: string) {
  if (!englishSpeechAvailable()) return
  const request = ++speechRequest
  if (pendingSpeech) {
    clearTimeout(pendingSpeech)
    pendingSpeech = null
  }
  window.speechSynthesis.cancel()
  const voice = await waitForAmericanVoice()
  if (request !== speechRequest) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

export function speakAmericanEnglishAfterPause(text: string, delayMs = 180) {
  cancelEnglishSpeech()
  pendingSpeech = setTimeout(() => {
    pendingSpeech = null
    speakAmericanEnglish(text)
  }, delayMs)
}

export function cancelEnglishSpeech() {
  speechRequest += 1
  if (pendingSpeech) {
    clearTimeout(pendingSpeech)
    pendingSpeech = null
  }
  if (englishSpeechAvailable()) window.speechSynthesis.cancel()
}
