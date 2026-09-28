import { onScopeDispose, watch, type Ref } from 'vue'

// Short synthesized chimes keep feedback available offline without audio downloads.
export function useAnswerSound(muted: Ref<boolean>) {
  let context: AudioContext | undefined
  let disposed = false
  let request = 0
  const active = new Set<OscillatorNode>()

  function stop() {
    request += 1
    for (const oscillator of active) oscillator.stop()
    active.clear()
  }

  async function play(correct: boolean) {
    if (muted.value || disposed) return
    try {
      if (!context) {
        const Audio = window.AudioContext
        if (!Audio) return
        context = new Audio()
      }
      stop()
      const currentRequest = request
      if (context.state === 'suspended') await context.resume()
      if (muted.value || disposed || currentRequest !== request) return
      const start = context.currentTime
      const notes = correct
        ? [
            { frequency: 659.25, offset: 0 },
            { frequency: 880, offset: 0.09 },
            { frequency: 1318.51, offset: 0.18 }
          ]
        : [
            { frequency: 349.23, offset: 0 },
            { frequency: 293.66, offset: 0.13 }
          ]
      for (const note of notes) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const at = start + note.offset
        const duration = correct ? 0.22 : 0.2
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(note.frequency, at)
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(correct ? 0.09 : 0.07, at + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
        gain.gain.setValueAtTime(0, at + duration + 0.01)
        oscillator.connect(gain)
        gain.connect(context.destination)
        active.add(oscillator)
        oscillator.onended = () => {
          active.delete(oscillator)
          oscillator.disconnect()
          gain.disconnect()
        }
        oscillator.start(at)
        oscillator.stop(at + duration + 0.02)
      }
    } catch {
      // Unsupported or blocked audio must never interrupt answering a question.
    }
  }
  watch(
    muted,
    (value) => {
      if (value) stop()
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    disposed = true
    request += 1
    // Let the final flashcard chime finish when self-rating navigates to results.
    const audio = context
    if (audio)
      setTimeout(() => {
        void audio.close().catch(() => {})
      }, 450)
  })
  return { play }
}
