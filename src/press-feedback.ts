const PRESSABLE_SELECTOR = 'button:not(:disabled), a[href], [role="button"]'
const MOVE_CANCEL_DISTANCE = 10
const MIN_PRESS_DURATION = 90

let pressedElement: HTMLElement | null = null
let pressedAt = 0
let startX = 0
let startY = 0

function releasePressedElement(immediately = false) {
  if (!pressedElement) return

  const element = pressedElement
  pressedElement = null
  if (immediately) {
    element.classList.remove('is-pressing')
    return
  }

  const remaining = Math.max(0, MIN_PRESS_DURATION - (performance.now() - pressedAt))

  window.setTimeout(() => {
    element.classList.remove('is-pressing')
  }, remaining)
}

function onPointerDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return

  const target = event.target
  if (!(target instanceof Element)) return

  const element = target.closest<HTMLElement>(PRESSABLE_SELECTOR)
  if (!element || element.getAttribute('aria-disabled') === 'true') return

  releasePressedElement(true)
  pressedElement = element
  pressedAt = performance.now()
  startX = event.clientX
  startY = event.clientY
  element.classList.add('is-pressing')
}

function onPointerMove(event: PointerEvent) {
  if (!pressedElement) return
  if (
    Math.abs(event.clientX - startX) > MOVE_CANCEL_DISTANCE ||
    Math.abs(event.clientY - startY) > MOVE_CANCEL_DISTANCE
  ) {
    releasePressedElement(true)
  }
}

export function installPressFeedback() {
  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerup', () => releasePressedElement(), { passive: true })
  document.addEventListener('pointercancel', () => releasePressedElement(true), { passive: true })
  window.addEventListener('blur', () => releasePressedElement(true))
}
