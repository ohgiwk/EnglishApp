export type AudioChannel = 'speech' | 'effects'

const key = (channel: AudioChannel) => `love-language-${channel}-volume`
const normalize = (value: number) =>
  Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 100

export function getAudioVolume(channel: AudioChannel): number {
  try {
    const saved = localStorage.getItem(key(channel))
    return saved === null || saved.trim() === '' ? 100 : normalize(Number(saved))
  } catch {
    return 100
  }
}

export function setAudioVolume(channel: AudioChannel, value: number): number {
  const volume = normalize(value)
  try {
    localStorage.setItem(key(channel), String(volume))
  } catch {
    // Keep controls usable when browser storage is unavailable.
  }
  return volume
}
