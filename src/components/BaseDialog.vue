<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    titleId: string
    descriptionId?: string
    dismissible?: boolean
    panelTag?: 'section' | 'article' | 'div'
    panelClass?: string
    initialFocus?: 'panel' | 'first'
    transitionName?: string
  }>(),
  { dismissible: false, panelTag: 'section', initialFocus: 'panel' }
)
const emit = defineEmits<{ close: [] }>()
const overlay = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const visible = ref(true)
function close() {
  if (props.transitionName) visible.value = false
  else emit('close')
}
defineExpose({ close })
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
const background: { element: HTMLElement; inert: boolean }[] = []
const focusable = () =>
  Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
    ) ?? []
  ).filter(
    (element) =>
      !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true'
  )
function focusInitial() {
  const target = props.initialFocus === 'first' ? (focusable()[0] ?? panel.value) : panel.value
  target?.focus()
}
function keydown(event: KeyboardEvent) {
  if (overlay.value?.inert) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    event.preventDefault()
    if (props.dismissible) close()
  }
  if (event.key !== 'Tab') return
  const controls = focusable()
  const first = controls[0],
    last = controls.at(-1)
  if (!first || !last) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const active = document.activeElement
  if (
    event.shiftKey &&
    (active === first || active === panel.value || !panel.value?.contains(active))
  ) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !panel.value?.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}
function containFocus(event: FocusEvent) {
  if (!overlay.value?.inert && event.target instanceof Node && !panel.value?.contains(event.target))
    focusInitial()
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  for (const element of Array.from(document.body.children)) {
    if (
      !(element instanceof HTMLElement) ||
      element === overlay.value ||
      element.tagName === 'SCRIPT'
    )
      continue
    background.push({ element, inert: element.inert })
    element.inert = true
  }
  document.addEventListener('keydown', keydown)
  document.addEventListener('focusin', containFocus)
  await nextTick()
  if (panel.value) focusInitial()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', keydown)
  document.removeEventListener('focusin', containFocus)
  for (const { element, inert } of background) element.inert = inert
  document.body.style.overflow = previousOverflow
  void nextTick(() => {
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus()
  })
})
</script>

<template>
  <Teleport to="body">
    <Transition :name="transitionName" :css="!!transitionName" appear @after-leave="emit('close')">
      <div v-if="visible" ref="overlay" v-bind="$attrs" @click.self="dismissible && close()">
        <component
          :is="panelTag"
          ref="panel"
          :class="panelClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          tabindex="-1"
        >
          <slot />
        </component>
      </div>
    </Transition>
  </Teleport>
</template>
