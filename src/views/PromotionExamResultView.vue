<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { vocabularyWords } from '../data/vocabulary'
import { examAnswer } from '../domain/promotion-exam'
import { useEnglishSpeech } from '../composables/useEnglishSpeech'
import ExamUnlockNotice from '../components/vocabulary/ExamUnlockNotice.vue'
const store = useAppStore()
const result = computed(() => store.s.examResults.at(-1))
const speech = useEnglishSpeech()
const entries = computed(
  () =>
    result.value?.answers.map((answer) => ({
      answer,
      word: vocabularyWords.find((word) => word.id === answer.wordId)!
    })) ?? []
)
</script>
<template>
  <section class="page exam-page">
    <template v-if="result">
      <h1>{{ result.passed ? '昇級試験 合格！' : '今回は不合格でした' }}</h1>
      <h2>{{ result.correctCount }} / 20 問正解</h2>
      <p>合格基準：18問以上正解</p>
      <p v-if="result.passed">レベル{{ result.level + 1 }}が解放されました。</p>
      <ExamUnlockNotice :level="result.unlockedExamLevel" />
      <RouterLink
        v-if="result.passed"
        class="primary"
        :to="{ path: '/learn', query: { level: result.level + 1 } }"
        >次のレベルを学習する</RouterLink
      >
      <RouterLink
        v-else-if="store.canTakeExam(result.level)"
        class="primary"
        :to="`/learn/exam/${result.level}`"
        >もう一度受験する</RouterLink
      >
      <RouterLink class="secondary" :to="{ path: '/learn', query: { level: result.level } }"
        >練習に戻る</RouterLink
      >
      <div v-for="(entry, index) in entries" :key="entry.answer.wordId" class="card exam-card">
        <h3>
          {{ index + 1 }}.
          {{ entry.answer.type === 'en-to-ja' ? entry.word.word : entry.word.meaningJa }}
        </h3>
        <p>
          {{ entry.answer.correct ? '正解' : '不正解' }} · あなたの回答：{{ entry.answer.selected }}
        </p>
        <p>正解：{{ examAnswer(entry.answer) }}</p>
        <button
          class="secondary"
          :aria-label="`${entry.word.word}の発音`"
          @click="speech.speak(entry.word.word)"
        >
          発音を聞く
        </button>
      </div>
    </template>
    <RouterLink v-else class="primary" to="/learn">Learnへ戻る</RouterLink>
  </section>
</template>
