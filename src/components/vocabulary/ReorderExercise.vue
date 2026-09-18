<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import type { ReorderQuestion, VocabularyQuestionToken } from '../../types'
defineProps<{
  question: ReorderQuestion
  revealed: boolean
  availableTokens: VocabularyQuestionToken[]
  placedTokens: VocabularyQuestionToken[]
}>()
const emit = defineEmits<{ remove: [id: string]; place: [id: string]; reset: []; submit: [] }>()
</script>
<template>
  <div class="reorder-exercise">
    <p class="reorder-hint">
      <small>文の意味</small>
      {{ question.promptJa }}
    </p>
    <div class="ordered-tokens" aria-label="並べた単語">
      <span v-if="!placedTokens.length">下の単語を順番にタップ</span>
      <button
        v-for="token in placedTokens"
        :key="token.id"
        type="button"
        :disabled="revealed"
        :aria-label="`${token.text} を元に戻す`"
        @click="emit('remove', token.id)"
      >
        {{ token.text }}
      </button>
    </div>
    <div class="token-bank" aria-label="並べ替える単語">
      <button
        v-for="token in availableTokens"
        :key="token.id"
        type="button"
        :disabled="revealed"
        :aria-label="`${token.text} を回答に追加`"
        @click="emit('place', token.id)"
      >
        {{ token.text }}
      </button>
    </div>
    <div class="reorder-actions">
      <button type="button" :disabled="revealed || !placedTokens.length" @click="emit('reset')">
        <RotateCcw :size="16" /> やり直す
      </button>
      <button
        class="primary"
        type="button"
        :disabled="revealed || placedTokens.length !== question.correctOrder.length"
        @click="emit('submit')"
      >
        答え合わせ
      </button>
    </div>
  </div>
</template>
