import { describe, expect, it } from 'vitest'
import { curatedVoices, supportedAmericanVoice, voiceGroups } from './voice-catalog'

const voice = (name: string, lang = 'en-US'): SpeechSynthesisVoice => ({
  name,
  lang,
  voiceURI: name,
  localService: true,
  default: false
})
describe('shared voice catalog', () => {
  it('uses the same locale and voice exclusions for selection and playback', () => {
    const voices = [
      voice('Allison'),
      voice('Google US English'),
      voice('Bells'),
      voice('Jenny'),
      voice('Allison UK', 'en-GB')
    ]
    const options = curatedVoices(voices)
    expect(options.map((item) => item.name)).toEqual(['Allison', 'Google US English'])
    expect(options.every(supportedAmericanVoice)).toBe(true)
    expect(voiceGroups(voices).flatMap((group) => group.voices)).toEqual(options)
  })

  it('keeps a single preferred quality variant and exposes otherwise unclassified voices', () => {
    const options = curatedVoices([
      voice('Allison'),
      voice('Allison (Enhanced)'),
      voice('New Voice')
    ])
    expect(options.map((item) => item.name)).toEqual(['Allison (Enhanced)', 'New Voice'])
    expect(voiceGroups(options).find((group) => group.label === 'その他の声')?.voices[0].name).toBe(
      'New Voice'
    )
  })
})
