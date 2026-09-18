const naturalVoice = (voice: SpeechSynthesisVoice) =>
  !/albert|bahh|bells|boing|bubbles|cellos|good news|bad news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo|rocko|sandy|shelley|kathy|fred|christopher|jenny|samantha/i.test(
    voice.name
  )
export const femaleVoice =
  /google us english|allison|ava|victoria|nicky|joelle|susan|zira|aria|michelle|emma|joanna|ivy|kendra|kimberly|salli|olivia|ana|jill|nora/i
export const maleVoice =
  /alex|aaron|nathan|michael|james|tom|david|mark|guy|eric|roger|matthew|joey|justin|kevin|brian|stephen/i
export const displayVoiceName = (voice: SpeechSynthesisVoice) =>
  voice.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/Multilingual/i, '')
    .replace(/\s+Online.*$/i, '')
    .replace(/\s*[-–]\s*English.*$/i, '')
    .replace(/\s*\((?:Natural|Enhanced|Premium)\).*$/i, '')
    .replace(/^Google US English$/i, 'Google US')
    .trim()
const voiceQuality = (voice: SpeechSynthesisVoice) =>
  /natural/i.test(voice.name)
    ? 4
    : /premium|enhanced/i.test(voice.name)
      ? 3
      : /online/i.test(voice.name)
        ? 2
        : voice.localService
          ? 1
          : 0
export const curatedVoices = (voices: SpeechSynthesisVoice[], pattern: RegExp = /.*/) => {
  const unique = new Map<string, SpeechSynthesisVoice>()
  for (const voice of voices.filter(
    (candidate) => supportedAmericanVoice(candidate) && pattern.test(candidate.name)
  )) {
    const key = displayVoiceName(voice).toLocaleLowerCase()
    const existing = unique.get(key)
    if (!existing || voiceQuality(voice) > voiceQuality(existing)) unique.set(key, voice)
  }
  return [...unique.values()].sort((a, b) => displayVoiceName(a).localeCompare(displayVoiceName(b)))
}

export const supportedAmericanVoice = (voice: SpeechSynthesisVoice) =>
  voice.lang.toLowerCase().replace('_', '-') === 'en-us' && naturalVoice(voice)

export function voiceGroups(voices: SpeechSynthesisVoice[]) {
  const available = curatedVoices(voices)
  return [
    { label: '女性の声', voices: available.filter((voice) => femaleVoice.test(voice.name)) },
    {
      label: '男性の声',
      voices: available.filter(
        (voice) => !femaleVoice.test(voice.name) && maleVoice.test(voice.name)
      )
    },
    {
      label: 'その他の声',
      voices: available.filter(
        (voice) => !femaleVoice.test(voice.name) && !maleVoice.test(voice.name)
      )
    }
  ].filter((group) => group.voices.length)
}
