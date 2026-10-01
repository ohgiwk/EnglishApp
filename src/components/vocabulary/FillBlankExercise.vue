<script setup lang="ts">
import type { FillBlankQuestion } from '../../types'
import ChoiceExercise from './ChoiceExercise.vue'
defineProps<{ question: FillBlankQuestion; revealed: boolean; selected: string }>()
const emit = defineEmits<{ choose: [value: string] }>()
</script>
<template>
  <div class="fill-blank">
    <p>
      {{ question.prompt }}
      <small class="fill-blank-translation">{{ question.promptJa }}</small>
    </p>
    <ChoiceExercise
      :question="question"
      :selected="selected"
      :revealed="revealed"
      :correct-answer="question.answer"
      @choose="emit('choose', $event)"
    />
  </div>
</template>
