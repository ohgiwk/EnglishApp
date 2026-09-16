<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { ArrowRight } from '@lucide/vue'
const store = useAppStore(),
  router = useRouter(),
  name = ref(''),
  nameInput = ref<HTMLInputElement>(),
  keyboardOffset = ref(0)
const emmaImage = `${import.meta.env.BASE_URL}assets/emma.png`

type KeyboardWindowEvent = Event & {
  keyboardHeight?: number
  detail?: { keyboardHeight?: number }
}

async function onKeyboardWillShow(event: Event) {
  const keyboardEvent = event as KeyboardWindowEvent
  const keyboardHeight =
    keyboardEvent.detail?.keyboardHeight ?? keyboardEvent.keyboardHeight ?? 0
  if (!keyboardHeight || document.activeElement !== nameInput.value) return

  keyboardOffset.value = 0
  await nextTick()
  requestAnimationFrame(() => {
    const inputRect = nameInput.value?.getBoundingClientRect()
    if (!inputRect) return

    const keyboardTop = window.innerHeight - keyboardHeight
    keyboardOffset.value = Math.min(0, keyboardTop - 16 - inputRect.bottom)
  })
}

function onKeyboardWillHide() {
  keyboardOffset.value = 0
}

onMounted(() => {
  window.addEventListener('keyboardWillShow', onKeyboardWillShow)
  window.addEventListener('keyboardWillHide', onKeyboardWillHide)
})

onBeforeUnmount(() => {
  window.removeEventListener('keyboardWillShow', onKeyboardWillShow)
  window.removeEventListener('keyboardWillHide', onKeyboardWillHide)
})

function go() {
  if (!name.value.trim()) return
  store.setName(name.value)
  router.push('/characters')
}
</script>
<template>
  <section class="name-page">
    <div class="mini-brand">Love Language ♡</div>
    <div class="name-art">
      <img :src="emmaImage" alt="エマ" />
    </div>
    <div class="speech">
      “What should I call you?”<small>あなたのこと、なんて呼べばいい？</small>
    </div>
    <div class="name-card" :style="{ transform: `translateY(${keyboardOffset}px)` }">
      <p class="eyebrow">YOUR NAME</p>
      <h1>あなたの名前を教えてください</h1>
      <input
        ref="nameInput"
        v-model="name"
        maxlength="12"
        placeholder="例：Haru"
        @keyup.enter="go"
      />
      <p>あとからプロフィールで変更できます</p>
      <button class="primary" :disabled="!name.trim()" @click="go">
        この名前で始める <ArrowRight :size="20" />
      </button>
    </div>
  </section>
</template>
