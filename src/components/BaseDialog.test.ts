// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseDialog from './BaseDialog.vue'

const wrappers: VueWrapper[] = []
afterEach(async () => {
  for (const wrapper of wrappers.splice(0).reverse()) wrapper.unmount()
  await nextTick()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})
function open(dismissible = true) {
  const wrapper = mount(BaseDialog, {
    props: { titleId: 'title', dismissible, initialFocus: 'first' },
    slots: {
      default:
        '<h2 id="title">Dialog</h2><button id="first">First</button><button disabled>Disabled</button><button id="last">Last</button>'
    },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}
const press = (key: string, shiftKey = false) =>
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
  )

describe('shared dialog interaction', () => {
  it('focuses the first control, traps Tab, disables the background, and restores focus', async () => {
    const background = document.createElement('main')
    background.innerHTML = '<button id="trigger">Open</button>'
    document.body.append(background)
    const trigger = background.querySelector<HTMLButtonElement>('button')!
    trigger.focus()
    const wrapper = open()
    await nextTick()
    expect(background.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement?.id).toBe('first')
    press('Tab', true)
    expect(document.activeElement?.id).toBe('last')
    press('Tab')
    expect(document.activeElement?.id).toBe('first')
    trigger.focus()
    expect(document.activeElement?.id).toBe('first')
    wrapper.unmount()
    wrappers.pop()
    await nextTick()
    expect(background.inert).toBeFalsy()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('allows Escape and backdrop dismissal only when configured', async () => {
    const dismissible = open()
    await nextTick()
    press('Escape')
    expect(dismissible.emitted('close')).toHaveLength(1)
    dismissible.unmount()
    wrappers.pop()
    const required = open(false)
    await nextTick()
    press('Escape')
    document.querySelector('[role="dialog"]')!.parentElement!.click()
    expect(required.emitted('close')).toBeUndefined()
  })

  it('keeps only the top dialog interactive and restores the underlying dialog', async () => {
    const lower = open()
    await nextTick()
    const lowerPanel = document.querySelector<HTMLElement>('[role="dialog"]')!
    const upper = open()
    await nextTick()
    expect(lowerPanel.parentElement?.inert).toBe(true)
    press('Escape')
    expect(upper.emitted('close')).toHaveLength(1)
    expect(lower.emitted('close')).toBeUndefined()
    upper.unmount()
    wrappers.pop()
    await nextTick()
    expect(lowerPanel.parentElement?.inert).toBeFalsy()
    expect(lowerPanel.contains(document.activeElement)).toBe(true)
  })
})
