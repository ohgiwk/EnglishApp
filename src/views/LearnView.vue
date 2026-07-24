<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookMarked, ChevronRight, LockKeyhole, MessageSquareText, Play } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'
import type { VocabularySessionMode } from '../types'

const store = useAppStore()
const router = useRouter()
const currentLevel = computed(() => store.s.unlockedVocabularyLevel)
const modes: { id: VocabularySessionMode; label: string; detail: string }[] = [
  { id: 'mixed', label: 'おまかせ', detail: '5種類をミックス' },
  { id: 'en-to-ja', label: '英 → 日', detail: '英単語から意味' },
  { id: 'ja-to-en', label: '日 → 英', detail: '意味から英単語' },
  { id: 'flashcard', label: 'カード', detail: '自分で思い出す' },
  { id: 'fill-blank', label: '穴埋め', detail: '空欄に入力' },
  { id: 'reorder', label: '並べ替え', detail: '順番にタップ' }
]
const selectedMode = computed({
  get: () => store.s.lastSelectedVocabularyMode,
  set: (mode: VocabularySessionMode) => store.setVocabularyMode(mode)
})
const levelProgress = (level: number) => {
  const words = vocabularyWords.filter((word) => word.level === level)
  const mastered = words.filter(
    (word) => store.s.wordProgress[word.id]?.status === 'mastered'
  ).length
  return { mastered, percent: Math.round((mastered / words.length) * 100) }
}
function start(level: number) {
  if (level > store.s.unlockedVocabularyLevel) return
  store.startVocabularySession(level, selectedMode.value)
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
          <span>10問スタート</span>
          <small>{{ modes.find((mode) => mode.id === selectedMode)?.label }}</small>
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

    <fieldset class="practice-mode">
      <legend>
        <span class="eyebrow">PRACTICE MODE</span>
        <b>練習モードを選ぶ</b>
      </legend>
      <div>
        <label v-for="mode in modes" :key="mode.id" :class="{ selected: selectedMode === mode.id }">
          <input v-model="selectedMode" type="radio" name="practice-mode" :value="mode.id" />
          <b>{{ mode.label }}</b>
          <small>{{ mode.detail }}</small>
        </label>
      </div>
    </fieldset>

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
