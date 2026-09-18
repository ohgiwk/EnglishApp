<script setup lang="ts">
import type { FillBlankQuestion } from '../../types'
defineProps<{ question: FillBlankQuestion; revealed: boolean }>()
const answer = defineModel<string>('answer', { required: true })
const emit = defineEmits<{ submit: [] }>()
</script>
<template>
  <form class="fill-blank" @submit.prevent="emit('submit')">
    <p>
      {{ question.prompt }}
      <small class="fill-blank-translation">{{ question.promptJa }}</small>
    </p>
    <label for="fill-answer">答えを入力</label>
    <div>
      <input
        id="fill-answer"
        v-model="answer"
        :disabled="revealed"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        inputmode="text"
      />
      <button class="primary" type="submit" :disabled="revealed || !answer.trim()">
        答え合わせ
      </button>
    </div>
  </form>
</template>
