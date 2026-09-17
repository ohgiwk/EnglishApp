<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookMarked,
  Check,
  Heart,
  Home,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  X
} from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyWords } from '../data/vocabulary'
import { speakAmericanEnglishAfterPause } from '../speech'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const router = useRouter()
const result = computed(() => store.s.lastVocabularyResult)
const animatedAccuracy = ref(0)
let accuracyFrame = 0
onMounted(() => {
  const target = result.value?.accuracy ?? 0
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedAccuracy.value = target
    return
  }
  const startedAt = performance.now()
  const animate = (time: number) => {
    const progress = Math.min(1, (time - startedAt) / 900)
    const eased = 1 - Math.pow(1 - progress, 3)
    animatedAccuracy.value = Math.round(target * eased)
    if (progress < 1) accuracyFrame = requestAnimationFrame(animate)
  }
  accuracyFrame = requestAnimationFrame(animate)
})
onBeforeUnmount(() => cancelAnimationFrame(accuracyFrame))
const studiedWords = computed(() =>
  (result.value?.answers ?? []).flatMap((answer) => {
    const word = vocabularyWords.find((item) => item.id === answer.wordId)
    return word ? [{ word, answer }] : []
  })
)
const comment = computed(() => {
  if (!result.value) return ''
  if (result.value.accuracy >= 80) return 'You were amazing! Studying with you is so much fun.'
  if (result.value.accuracy >= 50) return 'Nice work! We’re getting better together.'
  return 'Every mistake helps us learn. Let’s try again together!'
})
const commentJa = computed(() => {
  if (!result.value) return ''
  if (result.value.accuracy >= 80) return 'すごかったよ！一緒に勉強するの、すごく楽しい。'
  if (result.value.accuracy >= 50) return 'よくできました！一緒に上達してるね。'
  return '間違いも学びの一歩。一緒にもう一度やろう！'
})
function retry() {
  const completedResult = result.value
  if (!completedResult) return
  store.startVocabularySession(
    completedResult.level,
    completedResult.mode ?? 'mixed',
    store.s.lastSelectedVocabularyQuestionCount
  )
  const firstQuestion = store.s.activeVocabularySession?.questions[0]
  const firstWord = vocabularyWords.find((word) => word.id === firstQuestion?.wordId)
  if (firstWord) speakAmericanEnglishAfterPause(firstWord.word)
  router.push(`/learn/session/${completedResult.level}`)
}
</script>

<template>
  <section v-if="result" class="page vocab-result">
    <div class="result-celebration">
      <Sparkles />
      <p class="eyebrow">WORD SESSION COMPLETE</p>
      <h1 :aria-label="`正答率 ${result.accuracy}%`">{{ animatedAccuracy }}%</h1>
      <p>{{ result.correctCount }} / {{ result.totalCount }} words</p>
      <div class="result-stars">
        <Star
          v-for="index in 3"
          :key="index"
          :class="{ earned: result.accuracy >= index * 30 }"
          :fill="result.accuracy >= index * 30 ? 'currentColor' : 'none'"
        />
      </div>
    </div>

    <div class="result-emma">
      <EmmaPortrait :expression="result.accuracy >= 80 ? 'blush' : 'smile'" />
      <div>
        <b>Emma</b>
        <p>“{{ comment }}”</p>
        <small>{{ commentJa }}</small>
      </div>
    </div>

    <div class="reward-grid">
      <span
        ><b>+{{ result.earnedXp }}</b
        ><small>English XP</small></span
      >
      <span
        ><Heart /><b>+{{ result.affectionChange }}</b
        ><small>Affection - 愛情</small></span
      >
      <span
        ><ShieldCheck /><b>+{{ result.trustChange }}</b
        ><small>Trust - 信頼</small></span
      >
    </div>
    <p v-if="result.affectionChange === 0" class="reward-note">
      今日の関係値ボーナスは獲得済みです。XPと単語進捗は加算されています。
    </p>

    <div class="card result-list">
      <h2><BookMarked /> 今回学習した単語</h2>
      <p v-if="!studiedWords.length">この学習結果には単語ごとの記録がありません。</p>
      <div
        v-for="entry in studiedWords"
        :key="entry.word.id"
        class="result-word-row"
        :class="entry.answer.correct ? 'is-correct' : 'is-incorrect'"
      >
        <span class="result-word-copy">
          <b>{{ entry.word.word }}</b>
          <small>{{ entry.word.meaningJa }}</small>
        </span>
        <span class="result-word-status">
          <Check v-if="entry.answer.correct" :size="16" />
          <X v-else :size="16" />
          {{ entry.answer.correct ? '正解' : '不正解' }}
        </span>
      </div>
    </div>

    <button class="primary" @click="retry"><RotateCcw /> 同じモードでもう一度</button>
    <RouterLink class="secondary" to="/learn/words"><BookMarked /> 単語帳で確認</RouterLink>
    <RouterLink class="text-link" to="/learn"><Home /> Learnへ戻る</RouterLink>
  </section>
</template>
