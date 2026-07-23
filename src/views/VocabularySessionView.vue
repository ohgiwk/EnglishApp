<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronRight, RotateCcw, Volume2, X } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyWords } from '../data/vocabulary'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const selected = ref('')
const revealed = ref(false)
const wasCorrect = ref<boolean | null>(null)
const level = Number(route.params.level)

onMounted(() => {
  if (!store.s.activeVocabularySession) store.startVocabularySession(level)
  if (!store.s.activeVocabularySession) router.replace('/learn')
})

const session = computed(() => store.s.activeVocabularySession)
const question = computed(() => session.value?.questions[session.value.currentIndex])
const word = computed(() => vocabularyWords.find((item) => item.id === question.value?.wordId))
const progress = computed(() => session.value ? (session.value.currentIndex / session.value.questions.length) * 100 : 0)
const correctValue = computed(() =>
  question.value?.type === 'en-to-ja' ? word.value?.meaningJa : word.value?.word
)
const prompt = computed(() => {
  if (question.value?.type === 'en-to-ja') return word.value?.word
  if (question.value?.type === 'ja-to-en') return word.value?.meaningJa
  return word.value?.word
})
const promptLabel = computed(() =>
  question.value?.type === 'en-to-ja' ? 'いちばん近い意味は？' :
    question.value?.type === 'ja-to-en' ? 'この意味に合う英単語は？' :
      'この単語、覚えている？'
)

function choose(value: string) {
  if (revealed.value) return
  selected.value = value
  wasCorrect.value = value === correctValue.value
  revealed.value = true
}
function revealCard() {
  revealed.value = true
}
function rateCard(correct: boolean) {
  wasCorrect.value = correct
  next()
}
function next() {
  if (wasCorrect.value === null) return
  const result = store.answerVocabularyQuestion(wasCorrect.value)
  selected.value = ''
  revealed.value = false
  wasCorrect.value = null
  if (result) router.replace('/learn/result')
}
function speak() {
  if (!word.value || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(word.value.word))
}
</script>

<template>
  <section v-if="session && question && word" class="vocab-session">
    <header>
      <button aria-label="学習を閉じる" @click="router.push('/learn')"><X/></button>
      <div><small>LEVEL {{ session.level }}</small><b>{{ session.currentIndex + 1 }} / 10</b></div>
      <span>{{ Math.round(progress) }}%</span>
    </header>
    <div class="session-track"><i :style="{ width: `${progress}%` }"/></div>

    <div class="session-emma">
      <EmmaPortrait :expression="wasCorrect === true ? 'smile' : wasCorrect === false ? 'confused' : 'normal'"/>
      <div>
        {{ wasCorrect === true ? 'Great! You remembered it ♡' : wasCorrect === false ? 'Almost! Let’s remember it together.' : 'Take your time. I’m right here.' }}
        <small>{{ wasCorrect === true ? 'すごい、覚えてたね！' : wasCorrect === false ? '惜しい！一緒に覚えよう。' : 'ゆっくりで大丈夫。そばにいるよ。' }}</small>
      </div>
    </div>

    <main>
      <p class="eyebrow">{{ question.type === 'flashcard' ? 'FLASH CARD' : 'QUICK CHOICE' }}</p>
      <span class="question-label">{{ promptLabel }}</span>
      <div class="word-prompt">
        <h1>{{ prompt }}</h1>
        <button v-if="question.type !== 'ja-to-en'" aria-label="単語を再生" @click="speak"><Volume2/></button>
      </div>

      <template v-if="question.type !== 'flashcard'">
        <div class="vocab-options">
          <button
            v-for="option in question.options"
            :key="option"
            :class="{
              picked: selected === option,
              correct: revealed && option === correctValue,
              wrong: revealed && selected === option && option !== correctValue
            }"
            @click="choose(option)"
          >
            <span>{{ option }}</span>
            <Check v-if="revealed && option === correctValue" :size="18"/>
            <RotateCcw v-if="revealed && selected === option && option !== correctValue" :size="17"/>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="flash-answer" :class="{ open: revealed }">
          <span v-if="!revealed">答えを思い出してみよう</span>
          <template v-else>
            <strong>{{ word.meaningJa }}</strong>
            <small>{{ word.partOfSpeech }} · {{ word.category }}</small>
          </template>
        </div>
        <button v-if="!revealed" class="primary" @click="revealCard">答えを見る</button>
        <div v-else class="self-rating">
          <button @click="rateCard(false)"><RotateCcw/> もう一度</button>
          <button @click="rateCard(true)"><Check/> 覚えていた</button>
        </div>
      </template>

      <div v-if="revealed && question.type !== 'flashcard'" class="word-feedback">
        <b>{{ word.word }} <small>{{ word.partOfSpeech }}</small></b>
        <p>{{ word.meaningJa }}</p>
        <q>{{ word.example }}</q>
        <small>{{ word.exampleJa }}</small>
        <button class="primary" @click="next">次の問題へ <ChevronRight/></button>
      </div>
    </main>
  </section>
</template>
