<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen, Check, ChevronRight, Search, Volume2, X } from '@lucide/vue'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'
import type { VocabularyPartOfSpeech, VocabularyStatus, VocabularyWord } from '../types'

const store = useAppStore()
const search = ref('')
const level = ref(0)
const part = ref<VocabularyPartOfSpeech | ''>('')
const status = ref<VocabularyStatus | ''>('')
const selected = ref<VocabularyWord | null>(null)
const pageSize = ref(60)
const speechAvailable = 'speechSynthesis' in window

const statusOf = (word: VocabularyWord): VocabularyStatus =>
  store.s.wordProgress[word.id]?.status ?? 'new'
const filtered = computed(() =>
  vocabularyWords.filter((word) => {
    const needle = search.value.trim().toLowerCase()
    return (
      (!needle || word.word.includes(needle) || word.meaningJa.includes(needle)) &&
      (!level.value || word.level === level.value) &&
      (!part.value || word.partOfSpeech === part.value) &&
      (!status.value || statusOf(word) === status.value)
    )
  })
)
const visible = computed(() => filtered.value.slice(0, pageSize.value))
function speak(text: string) {
  if (!speechAvailable) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}
</script>

<template>
  <section class="page word-book">
    <header class="page-head">
      <p class="eyebrow">WORD BOOK</p>
      <h1>1,000 Words</h1>
      <p>エマと出会った単語も、これから出会う単語も。</p>
    </header>

    <label class="word-search"
      ><Search /><input v-model="search" placeholder="英単語・日本語で検索"
    /></label>
    <div class="word-filters">
      <select v-model="level">
        <option :value="0">すべてのLevel</option>
        <option v-for="item in vocabularyLevels" :value="item.id">Level {{ item.id }}</option>
      </select>
      <select v-model="part">
        <option value="">すべての品詞</option>
        <option value="noun">名詞</option>
        <option value="verb">動詞</option>
        <option value="adjective">形容詞</option>
        <option value="adverb">副詞</option>
        <option value="other">その他</option>
      </select>
      <select v-model="status">
        <option value="">すべての状態</option>
        <option value="new">未学習</option>
        <option value="learning">学習中</option>
        <option value="mastered">習得済み</option>
      </select>
    </div>
    <div class="word-count">{{ filtered.length }} words</div>

    <div class="word-list">
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
    <button
      v-if="visible.length < filtered.length"
      class="secondary load-more"
      @click="pageSize += 60"
    >
      さらに表示
    </button>

    <div v-if="selected" class="word-modal" @click.self="selected = null">
      <article>
        <button class="word-close" aria-label="詳細を閉じる" @click="selected = null"><X /></button>
        <p class="eyebrow">LEVEL {{ selected.level }} · {{ selected.category }}</p>
        <div class="word-title">
          <h1>{{ selected.word }}</h1>
          <button :disabled="!speechAvailable" @click="speak(selected.word)"><Volume2 /></button>
        </div>
        <span class="part-badge">{{ selected.partOfSpeech }}</span>
        <h2>{{ selected.meaningJa }}</h2>
        <div class="example-card">
          <BookOpen />
          <p>“{{ selected.example }}”</p>
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
      </article>
    </div>
  </section>
</template>
