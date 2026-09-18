<script setup lang="ts">
import { Check, RotateCcw } from '@lucide/vue'
import type { VocabularyWord } from '../../types'
defineProps<{ word: VocabularyWord; revealed: boolean }>()
const emit = defineEmits<{ reveal: []; rate: [correct: boolean] }>()
</script>
<template>
  <div class="flash-answer" :class="{ open: revealed }">
    <span v-if="!revealed">答えを思い出してみよう</span>
    <template v-else>
      <strong>{{ word.meaningJa }}</strong>
      <small>{{ word.partOfSpeech }} · {{ word.category }}</small>
    </template>
  </div>
  <button v-if="!revealed" class="primary" @click="emit('reveal')">答えを見る</button>
  <div v-else class="self-rating">
    <button @click="emit('rate', false)"><RotateCcw /> もう一度</button>
    <button @click="emit('rate', true)"><Check /> 覚えていた</button>
  </div>
</template>
