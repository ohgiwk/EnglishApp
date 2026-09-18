<script setup lang="ts">
import { Check, RotateCcw, ChevronRight, Volume2 } from '@lucide/vue'
import BaseDialog from '../BaseDialog.vue'
import type { VocabularyWord } from '../../types'
import type { vocabularyPresentation } from '../../domain/vocabulary-presentation'
defineProps<{
  correct: boolean
  word: VocabularyWord
  presentation: ReturnType<typeof vocabularyPresentation>
}>()
const emit = defineEmits<{ next: []; replay: [] }>()
</script>
<template>
  <BaseDialog
    class="answer-outcome-overlay"
    :class="correct ? 'is-correct' : 'is-incorrect'"
    title-id="answer-outcome-title"
    description-id="answer-outcome-description"
  >
    <div class="outcome-burst" aria-hidden="true">
      <i v-for="index in 8" :key="index" />
    </div>
    <span class="outcome-icon" aria-hidden="true">
      <Check v-if="correct" />
      <RotateCcw v-else />
    </span>
    <p class="eyebrow">{{ correct ? 'WELL DONE!' : 'NICE TRY!' }}</p>
    <h2 id="answer-outcome-title">{{ correct ? '正解！' : 'おしい！' }}</h2>
    <p id="answer-outcome-description">
      {{ correct ? 'その調子、しっかり身についてるよ。' : '大丈夫。答えを一緒に確認しよう。' }}
    </p>
    <div class="outcome-explanation">
      <p class="outcome-correct-answer">
        <small>正解</small>
        <strong>{{ presentation.correctAnswer }}</strong>
      </p>
      <div>
        <b
          >{{ word?.word }} <small>{{ word?.partOfSpeech }}</small></b
        >
        <p>{{ word?.meaningJa }}</p>
        <q>{{ presentation.sentence }}</q>
        <small>{{ presentation.translation }}</small>
        <button
          v-if="presentation.answerSpeech"
          class="outcome-pronunciation"
          type="button"
          aria-label="正解の英文を再生"
          @click="emit('replay')"
        >
          <Volume2 :size="16" /> 英文の発音
        </button>
      </div>
    </div>
    <button type="button" @click="emit('next')">次の問題へ <ChevronRight /></button>
  </BaseDialog>
</template>
