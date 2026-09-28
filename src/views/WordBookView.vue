<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { BookOpen, Check, ChevronRight, LockKeyhole, Search, Volume2, X } from '@lucide/vue'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { englishSpeechAvailable } from '../speech'
import BaseDialog from '../components/BaseDialog.vue'
import { useEnglishSpeech } from '../composables/useEnglishSpeech'
import { useAppStore } from '../stores/app'
import type { VocabularyPartOfSpeech, VocabularyStatus, VocabularyWord } from '../types'

const store = useAppStore()
const search = ref('')
const level = ref(1)
const part = ref<VocabularyPartOfSpeech | ''>('')
const status = ref<VocabularyStatus | ''>('')
const selected = ref<VocabularyWord | null>(null)
const pageSize = ref(60)
const speechAvailable = englishSpeechAvailable()

const statusOf = (word: VocabularyWord): VocabularyStatus =>
  store.s.wordProgress[word.id]?.status ?? 'new'
const unlockedWords = computed(() =>
  vocabularyWords.filter((word) => word.level <= store.s.unlockedVocabularyLevel)
)
watch([level, search, part, status], () => {
  pageSize.value = 60
})
watch(
  () => store.s.unlockedVocabularyLevel,
  (unlocked) => {
    if (level.value > unlocked) level.value = 1
    if (selected.value && selected.value.level > unlocked) selected.value = null
  }
)
function navigateTabs(event: KeyboardEvent) {
  const levels = vocabularyLevels.filter((item) => item.id <= store.s.unlockedVocabularyLevel)
  const index = levels.findIndex((item) => item.id === level.value)
  let next: number
  if (event.key === 'ArrowRight') next = (index + 1) % levels.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + levels.length) % levels.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = levels.length - 1
  else return
  event.preventDefault()
  level.value = levels[next]!.id
  document.getElementById(`word-level-${level.value}`)?.focus()
}
const filtered = computed(() =>
  unlockedWords.value.filter((word) => {
    const needle = search.value.trim().toLowerCase()
    return (
      (!needle || word.word.includes(needle) || word.meaningJa.includes(needle)) &&
      word.level === level.value &&
      (!part.value || word.partOfSpeech === part.value) &&
      (!status.value || statusOf(word) === status.value)
    )
  })
)
const visible = computed(() => filtered.value.slice(0, pageSize.value))
const loadTrigger = ref<HTMLElement | null>(null)
let loadObserver: IntersectionObserver | undefined
watch(
  [loadTrigger, () => visible.value.length],
  () => {
    loadObserver?.disconnect()
    if (!loadTrigger.value) return
    loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          pageSize.value = Math.min(pageSize.value + 60, filtered.value.length)
        }
      },
      { rootMargin: '240px 0px' }
    )
    loadObserver.observe(loadTrigger.value)
  },
  { flush: 'post' }
)
onBeforeUnmount(() => loadObserver?.disconnect())
const { speak } = useEnglishSpeech()
</script>

<template>
  <section class="page word-book">
    <header class="page-head">
      <div>
        <p class="eyebrow">WORD BOOK</p>
        <h1>{{ unlockedWords.length.toLocaleString() }} Words</h1>
      </div>
      <p>解放済みの単語を、レベル別に確認しよう。</p>
    </header>

    <div class="word-level-tabs" role="tablist" aria-label="単語のレベル" @keydown="navigateTabs">
      <button
        v-for="item in vocabularyLevels"
        :id="`word-level-${item.id}`"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="level === item.id"
        aria-controls="word-level-panel"
        :aria-label="`Level ${item.id}${item.id > store.s.unlockedVocabularyLevel ? '（未解放）' : ''}`"
        :tabindex="level === item.id ? 0 : -1"
        :disabled="item.id > store.s.unlockedVocabularyLevel"
        @click="level = item.id"
      >
        <LockKeyhole v-if="item.id > store.s.unlockedVocabularyLevel" :size="14" />
        Level {{ item.id }}
      </button>
    </div>
    <p class="word-level-hint">未解放のレベルは、昇格試験に合格すると確認できます。</p>
    <div id="word-level-panel" role="tabpanel" :aria-labelledby="`word-level-${level}`">
      <label class="word-search"
        ><Search /><input v-model="search" placeholder="英単語・日本語で検索"
      /></label>
      <div class="word-filters">
        <select v-model="part" aria-label="品詞">
          <option value="">すべての品詞</option>
          <option value="noun">名詞</option>
          <option value="verb">動詞</option>
          <option value="adjective">形容詞</option>
          <option value="adverb">副詞</option>
          <option value="other">その他</option>
        </select>
        <select v-model="status" aria-label="学習状態">
          <option value="">すべての状態</option>
          <option value="new">未学習</option>
          <option value="learning">学習中</option>
          <option value="mastered">習得済み</option>
        </select>
      </div>
      <div class="word-count">{{ filtered.length }} words</div>

      <p v-if="!filtered.length" class="word-empty" role="status">
        このレベルに条件に合う単語はありません。
      </p>
      <div v-else class="word-list">
        <button v-for="word in visible" :key="word.id" @click="selected = word">
          <i :class="statusOf(word)"><Check v-if="statusOf(word) === 'mastered'" /></i>
          <span
            ><b>{{ word.word }}</b
            ><small>{{ word.meaningJa }}</small></span
          >
          <em>Lv.{{ word.level }}</em
          ><ChevronRight />
        </button>
      </div>
      <div
        v-if="visible.length < filtered.length"
        ref="loadTrigger"
        class="word-load-trigger"
        aria-hidden="true"
      />
    </div>

    <BaseDialog
      v-if="selected"
      class="word-modal"
      panel-tag="article"
      title-id="word-detail-title"
      dismissible
      initial-focus="first"
      @close="selected = null"
    >
      <button class="word-close" aria-label="詳細を閉じる" @click="selected = null"><X /></button>
      <p class="eyebrow">LEVEL {{ selected.level }} · {{ selected.category }}</p>
      <div class="word-title">
        <h1 id="word-detail-title">{{ selected.word }}</h1>
        <button :disabled="!speechAvailable" @click="speak(selected.word)"><Volume2 /></button>
      </div>
      <span class="part-badge">{{ selected.partOfSpeech }}</span>
      <h2>{{ selected.meaningJa }}</h2>
      <div class="example-card">
        <BookOpen />
        <p>{{ selected.example }}</p>
        <small>{{ selected.exampleJa }}</small>
        <button :disabled="!speechAvailable" @click="speak(selected.example)">
          <Volume2 /> 例文を聞く
        </button>
      </div>
      <div class="word-detail-progress">
        <span
          ><b>{{ store.s.wordProgress[selected.id]?.correctCount ?? 0 }}</b
          >正解</span
        >
        <span
          ><b>{{ store.s.wordProgress[selected.id]?.incorrectCount ?? 0 }}</b
          >復習</span
        >
        <span
          ><b>{{ statusOf(selected) }}</b
          >状態</span
        >
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.word-load-trigger {
  height: 1px;
}

.word-level-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 10px;
}
.word-level-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex: 1 0 auto;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #e8e4e9;
  border-radius: 12px;
  background: white;
  color: #6e6872;
  font-weight: 700;
}
.word-level-tabs button[aria-selected='true'] {
  border-color: #bd6385;
  background: #fff0f5;
  color: #983d60;
}
.word-level-tabs button:disabled {
  background: #f3f1f4;
  color: #99909b;
  cursor: not-allowed;
}
.word-level-tabs button:focus-visible {
  outline: 2px solid #983d60;
  outline-offset: 2px;
}
.word-level-hint,
.word-empty {
  color: #6e6872;
  font-size: 12px;
  line-height: 1.7;
  margin: 0 0 16px;
}
.word-empty {
  text-align: center;
  padding: 24px 12px;
}
</style>
