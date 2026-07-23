<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookMarked, ChevronRight, LockKeyhole, MessageSquareText, Play } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const router = useRouter()
const currentLevel = computed(
  () => store.s.activeVocabularySession?.level ?? store.s.unlockedVocabularyLevel
)
const levelProgress = (level: number) => {
  const words = vocabularyWords.filter((word) => word.level === level)
  const mastered = words.filter(
    (word) => store.s.wordProgress[word.id]?.status === 'mastered'
  ).length
  return { mastered, percent: Math.round((mastered / words.length) * 100) }
}
function start(level: number) {
  if (level > store.s.unlockedVocabularyLevel) return
  if (!store.s.activeVocabularySession || store.s.activeVocabularySession.level !== level) {
    store.startVocabularySession(level)
  }
  router.push(`/learn/session/${level}`)
}
</script>

<template>
  <section class="page learn-page">
    <header class="page-head">
      <p class="eyebrow">LEARN WITH EMMA</p>
      <h1>一緒に覚えよう</h1>
      <p>10問ずつ、会話するように英単語を身につけよう。</p>
    </header>

    <div class="learn-hero">
      <div>
        <span>Today's study</span>
        <h2>“Ready for a little<br />word practice?”</h2>
        <p>少しだけ単語の練習、しない？</p>
        <button @click="start(currentLevel)">
          <Play :size="18" fill="currentColor" />
          {{ store.s.activeVocabularySession ? '続きから再開' : '10問スタート' }}
        </button>
      </div>
      <EmmaPortrait expression="smile" />
    </div>

    <div class="learn-summary">
      <div>
        <strong>{{ store.masteredVocabularyCount }}</strong
        ><span>Mastered</span>
      </div>
      <div>
        <strong>{{ store.todayVocabularySessions }}</strong
        ><span>Today</span>
      </div>
      <div>
        <strong>{{ store.s.xp }}</strong
        ><span>English XP</span>
      </div>
    </div>

    <div class="learn-links">
      <RouterLink to="/learn/words"
        ><BookMarked /><span><b>Word Book</b><small>1,000語から検索する</small></span
        ><ChevronRight
      /></RouterLink>
      <RouterLink to="/learn/review"
        ><MessageSquareText /><span
          ><b>Conversation Review</b><small>ストーリーで出会った表現</small></span
        ><ChevronRight
      /></RouterLink>
    </div>

    <div class="level-heading">
      <div>
        <p class="eyebrow">VOCABULARY LEVELS</p>
        <h2>6つのレベル</h2>
      </div>
      <small>70%習得で次へ</small>
    </div>
    <div class="vocab-levels">
      <button
        v-for="level in vocabularyLevels"
        :key="level.id"
        :class="{ locked: level.id > store.s.unlockedVocabularyLevel }"
        @click="start(level.id)"
      >
        <i :style="{ background: level.color }">{{ level.id }}</i>
        <span>
          <small>LEVEL {{ level.id }} · {{ level.subtitle }}</small>
          <b>{{ level.title }}</b>
          <em
            ><u :style="{ width: `${levelProgress(level.id).percent}%`, background: level.color }"
          /></em>
          <small>{{ levelProgress(level.id).mastered }} / {{ level.wordCount }} mastered</small>
        </span>
        <LockKeyhole v-if="level.id > store.s.unlockedVocabularyLevel" :size="19" />
        <ChevronRight v-else :size="19" />
      </button>
    </div>
  </section>
</template>
