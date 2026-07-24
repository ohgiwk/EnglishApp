<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookMarked, Heart, Home, RotateCcw, ShieldCheck, Sparkles, Star } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const router = useRouter()
const result = computed(() => store.s.lastVocabularyResult)
const reviewWords = computed(
  () =>
    result.value?.reviewWordIds
      .map((id) => vocabularyWords.find((word) => word.id === id))
      .filter(Boolean) ?? []
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
  if (!result.value) return
  store.startVocabularySession(result.value.level, result.value.mode ?? 'mixed')
  router.push(`/learn/session/${result.value.level}`)
}
</script>

<template>
  <section v-if="result" class="page vocab-result">
    <div class="result-celebration">
      <Sparkles />
      <p class="eyebrow">WORD SESSION COMPLETE</p>
      <h1>{{ result.accuracy }}%</h1>
      <p>{{ result.correctCount }} / {{ result.totalCount }} words</p>
      <div class="result-stars">
        <Star
          v-for="index in 3"
          :key="index"
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
      <h2><RotateCcw /> もう一度会いたい単語</h2>
      <p v-if="!reviewWords.length">全問正解！復習が必要な単語はありません。</p>
      <div v-for="word in reviewWords" :key="word!.id">
        <b>{{ word!.word }}</b
        ><span>{{ word!.meaningJa }}</span>
      </div>
    </div>

    <button class="primary" @click="retry"><RotateCcw /> 同じモードでもう一度</button>
    <RouterLink class="secondary" to="/learn/words"><BookMarked /> 単語帳で確認</RouterLink>
    <RouterLink class="text-link" to="/learn"><Home /> Learnへ戻る</RouterLink>
  </section>
</template>
