<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  MessageSquareText,
  Play
} from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'
import type { VocabularyQuestionCount, VocabularySessionMode, VocabularyStatus } from '../types'

const store = useAppStore()
const router = useRouter()
const selectedLevel = ref(store.s.unlockedVocabularyLevel)
const levelMenuOpen = ref(false)
const levelPicker = ref<HTMLElement | null>(null)
const levelTrigger = ref<HTMLButtonElement | null>(null)
const selectedLevelDefinition = computed(() =>
  vocabularyLevels.find((level) => level.id === selectedLevel.value)
)
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
const questionCounts: { value: VocabularyQuestionCount; label: string }[] = [
  { value: 10, label: '10問' },
  { value: 20, label: '20問' },
  { value: 50, label: '50問' },
  { value: 'all', label: '全単語' }
]
const selectedQuestionCount = computed({
  get: () => store.s.lastSelectedVocabularyQuestionCount,
  set: (count: VocabularyQuestionCount) => store.setVocabularyQuestionCount(count)
})
const selectedQuestionCountLabel = computed(
  () => questionCounts.find((item) => item.value === selectedQuestionCount.value)?.label
)
const statusOptions: { value: VocabularyStatus; label: string; detail: string }[] = [
  { value: 'new', label: '未学習', detail: 'まだ取り組んでいない単語' },
  { value: 'learning', label: '学習中', detail: '練習を始めた単語' },
  { value: 'mastered', label: '学習済み', detail: '習得した単語' }
]
const selectedStatuses = computed(() => store.s.lastSelectedVocabularyStatuses)
const availableWordCount = computed(
  () =>
    vocabularyWords.filter((word) => {
      const status = store.s.wordProgress[word.id]?.status ?? 'new'
      return word.level === selectedLevel.value && selectedStatuses.value.includes(status)
    }).length
)
function toggleStatus(status: VocabularyStatus) {
  const current = selectedStatuses.value
  if (current.includes(status)) {
    if (current.length === 1) return
    store.setVocabularyStatuses(current.filter((item) => item !== status))
    return
  }
  store.setVocabularyStatuses([...current, status])
}
const levelProgress = (level: number) => {
  const words = vocabularyWords.filter((word) => word.level === level)
  const mastered = words.filter(
    (word) => store.s.wordProgress[word.id]?.status === 'mastered'
  ).length
  const learning = words.filter(
    (word) =>
      store.s.wordProgress[word.id]?.status === 'learning' &&
      (store.s.wordProgress[word.id]?.incorrectCount ?? 0) === 0
  ).length
  const incorrect = words.filter(
    (word) =>
      store.s.wordProgress[word.id]?.status === 'learning' &&
      (store.s.wordProgress[word.id]?.incorrectCount ?? 0) > 0
  ).length
  return {
    mastered,
    learning,
    incorrect,
    masteredPercent: (mastered / words.length) * 100,
    learningPercent: (learning / words.length) * 100,
    incorrectPercent: (incorrect / words.length) * 100
  }
}
function selectLevel(level: number) {
  if (level > store.s.unlockedVocabularyLevel) return
  selectedLevel.value = level
  levelMenuOpen.value = false
  void nextTick(() => levelTrigger.value?.focus())
}
function closeLevelMenu(event: PointerEvent) {
  if (!levelMenuOpen.value || levelPicker.value?.contains(event.target as Node)) return
  levelMenuOpen.value = false
}
function handleLevelMenuKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !levelMenuOpen.value) return
  event.preventDefault()
  levelMenuOpen.value = false
  levelTrigger.value?.focus()
}
onMounted(() => {
  document.addEventListener('pointerdown', closeLevelMenu)
  document.addEventListener('keydown', handleLevelMenuKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeLevelMenu)
  document.removeEventListener('keydown', handleLevelMenuKeydown)
})
function start() {
  store.startVocabularySession(selectedLevel.value, selectedMode.value, selectedQuestionCount.value)
  router.push(`/learn/session/${selectedLevel.value}`)
}
</script>

<template>
  <section class="page learn-page">
    <header class="page-head">
      <p class="eyebrow">LEARN WITH EMMA</p>
      <h1>一緒に覚えよう</h1>
      <p>レベルを選んで、収録単語を重複なしで一巡しよう。</p>
    </header>

    <div class="learn-hero">
      <div>
        <span>Today's study</span>
        <h2>“Ready for a little<br />word practice?”</h2>
        <p>少しだけ単語の練習、しない？</p>
        <button :disabled="availableWordCount === 0" @click="start">
          <Play :size="18" fill="currentColor" />
          <span>LEVEL {{ selectedLevel }}をスタート</span>
          <small>
            {{ selectedQuestionCountLabel }} ·
            {{ modes.find((mode) => mode.id === selectedMode)?.label }}
          </small>
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
        <strong>{{ store.todayVocabularyWordCount }}</strong
        ><span>Today</span>
      </div>
      <div>
        <strong>{{ store.s.xp }}</strong
        ><span>English XP</span>
      </div>
    </div>

    <fieldset class="level-picker">
      <legend>
        <span class="eyebrow">VOCABULARY LEVEL</span>
        <b>学習するレベルを選ぶ</b>
      </legend>
      <div ref="levelPicker" class="custom-level-select">
        <button
          ref="levelTrigger"
          class="level-select-trigger"
          type="button"
          aria-haspopup="listbox"
          :aria-expanded="levelMenuOpen"
          @click="levelMenuOpen = !levelMenuOpen"
        >
          <i :style="{ background: selectedLevelDefinition?.color }">{{ selectedLevel }}</i>
          <span>
            <small>LEVEL {{ selectedLevel }} · {{ selectedLevelDefinition?.subtitle }}</small>
            <b>{{ selectedLevelDefinition?.title }}</b>
            <em class="level-progress-indicator">
              <u
                class="mastered"
                :style="{ width: `${levelProgress(selectedLevel).masteredPercent}%` }"
              />
              <u
                class="learning"
                :style="{ width: `${levelProgress(selectedLevel).learningPercent}%` }"
              />
              <u
                class="incorrect"
                :style="{ width: `${levelProgress(selectedLevel).incorrectPercent}%` }"
              />
            </em>
            <small class="level-progress-stats">
              <span class="mastered">学習済み {{ levelProgress(selectedLevel).mastered }}</span>
              <span class="learning">学習中 {{ levelProgress(selectedLevel).learning }}</span>
              <span class="incorrect">間違えた {{ levelProgress(selectedLevel).incorrect }}</span>
            </small>
          </span>
          <ChevronDown :class="{ open: levelMenuOpen }" :size="20" />
        </button>
        <Transition name="level-menu">
          <div v-if="levelMenuOpen" class="level-select-menu" role="listbox">
            <button
              v-for="level in vocabularyLevels"
              :key="level.id"
              type="button"
              role="option"
              :aria-selected="level.id === selectedLevel"
              :disabled="level.id > store.s.unlockedVocabularyLevel"
              :class="{
                selected: level.id === selectedLevel,
                locked: level.id > store.s.unlockedVocabularyLevel
              }"
              @click="selectLevel(level.id)"
            >
              <i :style="{ background: level.color }">{{ level.id }}</i>
              <span>
                <small>LEVEL {{ level.id }} · {{ level.subtitle }}</small>
                <b>{{ level.title }}</b>
                <em class="level-progress-indicator">
                  <u
                    class="mastered"
                    :style="{ width: `${levelProgress(level.id).masteredPercent}%` }"
                  />
                  <u
                    class="learning"
                    :style="{ width: `${levelProgress(level.id).learningPercent}%` }"
                  />
                  <u
                    class="incorrect"
                    :style="{ width: `${levelProgress(level.id).incorrectPercent}%` }"
                  />
                </em>
                <small class="level-progress-stats">
                  <span class="mastered">学習済み {{ levelProgress(level.id).mastered }}</span>
                  <span class="learning">学習中 {{ levelProgress(level.id).learning }}</span>
                  <span class="incorrect">間違えた {{ levelProgress(level.id).incorrect }}</span>
                </small>
              </span>
              <LockKeyhole v-if="level.id > store.s.unlockedVocabularyLevel" :size="17" />
            </button>
          </div>
        </Transition>
      </div>
    </fieldset>

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

    <fieldset class="practice-mode question-count">
      <legend>
        <span class="eyebrow">SESSION LENGTH</span>
        <b>問題数を選ぶ</b>
      </legend>
      <div>
        <label
          v-for="item in questionCounts"
          :key="item.value"
          :class="{ selected: selectedQuestionCount === item.value }"
        >
          <input
            v-model="selectedQuestionCount"
            type="radio"
            name="question-count"
            :value="item.value"
          />
          <b>{{ item.label }}</b>
        </label>
      </div>
    </fieldset>

    <fieldset class="practice-mode word-status-filter">
      <legend>
        <span class="eyebrow">WORD STATUS</span>
        <b>出題する単語を選ぶ</b>
      </legend>
      <div>
        <label
          v-for="option in statusOptions"
          :key="option.value"
          :class="{ selected: selectedStatuses.includes(option.value) }"
        >
          <input
            type="checkbox"
            :checked="selectedStatuses.includes(option.value)"
            :disabled="selectedStatuses.length === 1 && selectedStatuses.includes(option.value)"
            @change="toggleStatus(option.value)"
          />
          <b>{{ option.label }}</b>
          <small>{{ option.detail }}</small>
        </label>
      </div>
      <p :class="{ empty: availableWordCount === 0 }">対象：{{ availableWordCount }}語</p>
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
  </section>
</template>
