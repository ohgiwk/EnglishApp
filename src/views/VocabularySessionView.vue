<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { Volume2, VolumeX, X } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import ChoiceExercise from '../components/vocabulary/ChoiceExercise.vue'
import FlashcardExercise from '../components/vocabulary/FlashcardExercise.vue'
import FillBlankExercise from '../components/vocabulary/FillBlankExercise.vue'
import ReorderExercise from '../components/vocabulary/ReorderExercise.vue'
import VocabularyOutcomeDialog from '../components/vocabulary/VocabularyOutcomeDialog.vue'
import VocabularyExitDialog from '../components/vocabulary/VocabularyExitDialog.vue'
import { vocabularyWords } from '../data/vocabulary'
import { vocabularyCommentFor, type VocabularyCommentState } from '../data/vocabulary-comments'
import { useAppStore } from '../stores/app'
import { useVocabularyExercise } from '../composables/useVocabularyExercise'
import { useVocabularySpeech } from '../composables/useVocabularySpeech'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const session = computed(() => store.s.activeVocabularySession)
const question = computed(() => session.value?.questions[session.value.currentIndex])
const word = computed(() => vocabularyWords.find((item) => item.id === question.value?.wordId))
const { muted, presentation, answer, replay, toggleMute } = useVocabularySpeech(question, word)
const {
  selected,
  fillAnswer,
  revealed,
  wasCorrect,
  showOutcome,
  availableTokens,
  placedTokens,
  choose,
  revealCard,
  checkFillBlank,
  placeToken,
  removeToken,
  resetOrder,
  checkOrder,
  next,
  rateCard
} = useVocabularyExercise(question, word, answer, (correct) => {
  const result = store.answerVocabularyQuestion(correct)
  if (result) void router.replace('/learn/result')
})
const showExitDialog = ref(false)
let resolvePendingExit: ((allow: boolean) => void) | null = null
const commentState = computed<VocabularyCommentState>(() =>
  wasCorrect.value === true ? 'correct' : wasCorrect.value === false ? 'incorrect' : 'waiting'
)
const emmaComment = computed(() =>
  vocabularyCommentFor(question.value?.wordId ?? 'vocabulary', commentState.value)
)
const progress = computed(() =>
  session.value ? (session.value.currentIndex / session.value.questions.length) * 100 : 0
)

onMounted(() => {
  if (!session.value) store.startVocabularySession(Number(route.params.level))
  if (!session.value) void router.replace('/learn')
  window.addEventListener('beforeunload', confirmBrowserExit)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', confirmBrowserExit)
  resolvePendingExit?.(false)
})
onBeforeRouteLeave(() => {
  if (!session.value) return true
  if (showExitDialog.value) return false
  showExitDialog.value = true
  return new Promise<boolean>((resolve) => {
    resolvePendingExit = resolve
  })
})
function confirmBrowserExit(event: BeforeUnloadEvent) {
  if (!session.value) return
  event.preventDefault()
  event.returnValue = ''
}
function stayInSession() {
  showExitDialog.value = false
  resolvePendingExit?.(false)
  resolvePendingExit = null
}
function confirmInterruption() {
  stayInSession()
  const result = store.finishVocabularySession()
  void router.replace(result ? '/learn/result' : '/learn')
}
</script>

<template>
  <div class="vocabulary-session-route">
    <section
      v-if="session && question && word && presentation"
      class="vocab-session"
      :inert="showExitDialog || showOutcome || undefined"
      :aria-hidden="showExitDialog || showOutcome || undefined"
    >
      <header>
        <button aria-label="学習を閉じる" @click="router.push('/learn')"><X /></button>
        <div>
          <small>LEVEL {{ session.level }}</small
          ><b>{{ session.currentIndex + 1 }} / {{ session.questions.length }}</b>
        </div>
        <button
          :aria-label="muted ? '自動読み上げをオンにする' : '自動読み上げをミュートする'"
          :aria-pressed="muted"
          @click="toggleMute"
        >
          <VolumeX v-if="muted" />
          <Volume2 v-else />
        </button>
      </header>
      <div class="session-track"><i :style="{ width: `${progress}%` }" /></div>

      <div class="session-emma">
        <EmmaPortrait
          :expression="wasCorrect === true ? 'smile' : wasCorrect === false ? 'confused' : 'normal'"
        />
        <div>
          {{ emmaComment.english }}
          <small>{{ emmaComment.japanese }}</small>
        </div>
      </div>

      <main>
        <p class="eyebrow">{{ presentation.label }}</p>
        <div class="question-instruction">
          <span class="question-label">{{ presentation.instruction }}</span>
          <button
            v-if="presentation.questionSpeech"
            type="button"
            aria-label="単語を再生"
            @click="replay(false)"
          >
            <Volume2 :size="16" /> 発音
          </button>
        </div>
        <div v-if="presentation.questionSpeech" class="word-prompt">
          <h1>{{ presentation.prompt }}</h1>
        </div>

        <ChoiceExercise
          v-if="question.type === 'en-to-ja' || question.type === 'ja-to-en'"
          :question="question"
          :selected="selected"
          :revealed="revealed"
          :correct-answer="presentation.correctAnswer"
          @choose="choose"
        />
        <FlashcardExercise
          v-else-if="question.type === 'flashcard'"
          :word="word"
          :revealed="revealed"
          @reveal="revealCard"
          @rate="rateCard"
        />
        <FillBlankExercise
          v-else-if="question.type === 'fill-blank'"
          :question="question"
          :revealed="revealed"
          v-model:answer="fillAnswer"
          @submit="checkFillBlank"
        />
        <ReorderExercise
          v-else-if="question.type === 'reorder'"
          :question="question"
          :revealed="revealed"
          :available-tokens="availableTokens"
          :placed-tokens="placedTokens"
          @place="placeToken"
          @remove="removeToken"
          @reset="resetOrder"
          @submit="checkOrder"
        />
      </main>
    </section>

    <VocabularyOutcomeDialog
      v-if="showOutcome && wasCorrect !== null && word && presentation"
      :correct="wasCorrect"
      :word="word"
      :presentation="presentation"
      @next="next"
      @replay="replay(true)"
    />
    <VocabularyExitDialog
      v-if="showExitDialog"
      :answered-count="session?.answers.length ?? 0"
      @stay="stayInSession"
      @interrupt="confirmInterruption"
    />
  </div>
</template>
