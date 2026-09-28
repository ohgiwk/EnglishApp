// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useAnswerSound } from './useAnswerSound'

let scope: ReturnType<typeof effectScope>
const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = []
const close = vi.fn(() => Promise.resolve())
let resume: () => Promise<void>
let audioState: string
beforeEach(() => {
  vi.useFakeTimers()
  oscillators.length = 0
  close.mockClear()
  audioState = 'running'
  resume = () => Promise.resolve()
  vi.stubGlobal(
    'AudioContext',
    class {
      state = audioState
      currentTime = 0
      destination = {}
      resume = () => resume()
      close = close
      createOscillator() {
        const node = {
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null
        }
        oscillators.push(node)
        return node
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
          },
          connect: vi.fn(),
          disconnect: vi.fn()
        }
      }
    }
  )
  scope = effectScope()
})
afterEach(() => {
  scope.stop()
  vi.runAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it('plays distinct short sounds, silences on mute and releases audio after leaving', async () => {
  const muted = ref(false)
  const sound = scope.run(() => useAnswerSound(muted))!
  await sound.play(true)
  expect(oscillators).toHaveLength(3)
  expect(oscillators.every((node) => node.start.mock.calls.length === 1)).toBe(true)
  await sound.play(false)
  expect(oscillators).toHaveLength(5)
  muted.value = true
  expect(oscillators.at(-1)!.stop).toHaveBeenCalledTimes(2)
  await sound.play(true)
  expect(oscillators).toHaveLength(5)
  scope.stop()
  vi.runAllTimers()
  expect(close).toHaveBeenCalledOnce()
})
it('does not play a delayed sound if muted while audio is resuming', async () => {
  audioState = 'suspended'
  let release!: () => void
  resume = () =>
    new Promise<void>((resolve) => {
      release = resolve
    })
  const muted = ref(false)
  const sound = scope.run(() => useAnswerSound(muted))!
  const pending = sound.play(true)
  muted.value = true
  release()
  await pending
  expect(oscillators).toHaveLength(0)
})
it('does not fail the answer when audio is blocked or unavailable', async () => {
  audioState = 'suspended'
  resume = () => Promise.reject(new Error('Audio blocked'))
  const sound = scope.run(() => useAnswerSound(ref(false)))!
  await expect(sound.play(false)).resolves.toBeUndefined()
  vi.stubGlobal('AudioContext', undefined)
  const unavailable = scope.run(() => useAnswerSound(ref(false)))!
  await expect(unavailable.play(true)).resolves.toBeUndefined()
})
