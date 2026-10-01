<script setup lang="ts">
import { Check, RotateCcw } from '@lucide/vue'
import type { ChoiceQuestion } from '../../types'
defineProps<{
  question: Pick<ChoiceQuestion, 'options'>
  selected: string
  revealed: boolean
  correctAnswer: string
}>()
const emit = defineEmits<{ choose: [value: string] }>()
</script>
<template>
  <div class="vocab-options">
    <button
      v-for="option in question.options"
      :key="option"
      type="button"
      :disabled="revealed"
      :class="{
        picked: selected === option,
        correct: revealed && option === correctAnswer,
        wrong: revealed && selected === option && option !== correctAnswer
      }"
      @click="emit('choose', option)"
    >
      <span>{{ option }}</span>
      <Check v-if="revealed && option === correctAnswer" :size="18" />
      <RotateCcw v-if="revealed && selected === option && option !== correctAnswer" :size="17" />
    </button>
  </div>
</template>
