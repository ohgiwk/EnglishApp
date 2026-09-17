const normalizedLanguage = (voice: SpeechSynthesisVoice) =>
  voice.lang.toLowerCase().replace('_', '-')

const preferredAmericanVoice = (voices: SpeechSynthesisVoice[]) => {
  const americanVoices = voices.filter((voice) => normalizedLanguage(voice) === 'en-us')
  const priorities = [
    /google us english/i,
    /microsoft.*(aria|jenny|guy)/i,
    /^samantha/i,
    /^allison/i,
    /^ava/i
  ]
  for (const pattern of priorities) {
    const voice = americanVoices.find((candidate) => pattern.test(candidate.name))
    if (voice) return voice
  }
  return americanVoices[0] ?? null
}

let pendingSpeech: ReturnType<typeof setTimeout> | null = null
let speechRequest = 0
let selectedAmericanVoice: SpeechSynthesisVoice | null = null

export const englishSpeechAvailable = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

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

export function speakAmericanEnglishAfterPause(text: string, delayMs = 350) {
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
