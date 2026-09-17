<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { Check, ChevronRight, RotateCcw, Volume2, X } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { vocabularyWords } from '../data/vocabulary'
import { vocabularyCommentFor, type VocabularyCommentState } from '../data/vocabulary-comments'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const selected = ref('')
const fillAnswer = ref('')
const placedTokenIds = ref<string[]>([])
const revealed = ref(false)
const wasCorrect = ref<boolean | null>(null)
const showOutcome = ref(false)
const showExitDialog = ref(false)
const outcomePanel = ref<HTMLElement | null>(null)
const stayButton = ref<HTMLButtonElement | null>(null)
const interruptButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let resolvePendingExit: ((allow: boolean) => void) | null = null
const level = Number(route.params.level)

onMounted(() => {
  if (!store.s.activeVocabularySession) store.startVocabularySession(level)
  if (!store.s.activeVocabularySession) router.replace('/learn')
  window.addEventListener('beforeunload', confirmBrowserExit)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', confirmBrowserExit)
})
onBeforeRouteLeave(() => {
  if (!store.s.activeVocabularySession) return true
  if (showExitDialog.value) return false
  return new Promise<boolean>((resolve) => {
    resolvePendingExit = resolve
    openExitDialog()
  })
})

function confirmBrowserExit(event: BeforeUnloadEvent) {
  if (!store.s.activeVocabularySession) return
  event.preventDefault()
  event.returnValue = ''
}

watch([revealed, wasCorrect], ([isRevealed, correct]) => {
  if (!isRevealed || correct === null || question.value?.type === 'flashcard') return
  showOutcome.value = true
  void nextTick(() => outcomePanel.value?.focus())
})

function openExitDialog() {
  if (showExitDialog.value) return
  previouslyFocused = document.activeElement as HTMLElement | null
  showExitDialog.value = true
  void nextTick(() => stayButton.value?.focus())
}

function stayInSession() {
  const resolve = resolvePendingExit
  resolvePendingExit = null
  showExitDialog.value = false
  resolve?.(false)
  void nextTick(() => previouslyFocused?.focus())
}

function confirmInterruption() {
  const resolve = resolvePendingExit
  resolvePendingExit = null
  showExitDialog.value = false
  resolve?.(false)
  const result = store.finishVocabularySession()
  void router.replace(result ? '/learn/result' : '/learn')
}

function handleExitDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    stayInSession()
    return
  }
  if (event.key !== 'Tab') return
  const first = stayButton.value
  const last = interruptButton.value
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const session = computed(() => store.s.activeVocabularySession)
const question = computed(() => session.value?.questions[session.value.currentIndex])
const word = computed(() => vocabularyWords.find((item) => item.id === question.value?.wordId))
const commentState = computed<VocabularyCommentState>(() =>
  wasCorrect.value === true ? 'correct' : wasCorrect.value === false ? 'incorrect' : 'waiting'
)
const emmaComment = computed(() =>
  vocabularyCommentFor(question.value?.wordId ?? 'vocabulary', commentState.value)
)
const progress = computed(() =>
  session.value ? (session.value.currentIndex / session.value.questions.length) * 100 : 0
)
const correctValue = computed(() =>
  question.value?.type === 'en-to-ja' ? word.value?.meaningJa : word.value?.word
)
const correctAnswerDisplay = computed(() => {
  if (question.value?.type === 'fill-blank') return question.value.answer
  if (question.value?.type === 'reorder') return question.value.prompt
  return correctValue.value
})
const isChoice = computed(
  () => question.value?.type === 'en-to-ja' || question.value?.type === 'ja-to-en'
)
const prompt = computed(() => {
  if (question.value?.type === 'en-to-ja') return word.value?.word
  if (question.value?.type === 'ja-to-en') return word.value?.meaningJa
  return word.value?.word
})
const promptLabel = computed(() =>
  question.value?.type === 'en-to-ja'
    ? 'いちばん近い意味は？'
    : question.value?.type === 'ja-to-en'
      ? 'この意味に合う英単語は？'
      : question.value?.type === 'fill-blank'
        ? '空欄に入る英単語を入力してね'
        : question.value?.type === 'reorder'
          ? '単語を正しい順番に並べよう'
          : 'この単語、覚えている？'
)
const exerciseLabel = computed(() => {
  if (question.value?.type === 'fill-blank') return 'FILL IN THE BLANK'
  if (question.value?.type === 'reorder') return 'WORD ORDER'
  if (question.value?.type === 'flashcard') return 'FLASH CARD'
  return 'QUICK CHOICE'
})
const availableTokens = computed(
  () => question.value?.tokens?.filter((token) => !placedTokenIds.value.includes(token.id)) ?? []
)
const placedTokens = computed(() =>
  placedTokenIds.value
    .map((id) => question.value?.tokens?.find((token) => token.id === id))
    .filter((token) => token !== undefined)
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
function checkFillBlank() {
  if (revealed.value || !fillAnswer.value.trim()) return
  const normalize = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase()
  wasCorrect.value = normalize(fillAnswer.value) === normalize(question.value?.answer ?? '')
  revealed.value = true
}
function placeToken(id: string) {
  if (revealed.value || placedTokenIds.value.includes(id)) return
  placedTokenIds.value.push(id)
}
function removeToken(id: string) {
  if (revealed.value) return
  placedTokenIds.value = placedTokenIds.value.filter((tokenId) => tokenId !== id)
}
function resetOrder() {
  if (revealed.value) return
  placedTokenIds.value = []
}
function checkOrder() {
  if (
    revealed.value ||
    placedTokenIds.value.length !== (question.value?.correctOrder?.length ?? 0)
  ) {
    return
  }
  wasCorrect.value =
    placedTokenIds.value.join('|') === (question.value?.correctOrder ?? []).join('|')
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
  fillAnswer.value = ''
  placedTokenIds.value = []
  showOutcome.value = false
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
  <div class="vocabulary-session-route">
    <section
      v-if="session && question && word"
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
        <p class="eyebrow">{{ exerciseLabel }}</p>
        <span class="question-label">{{ promptLabel }}</span>
        <div
          v-if="question.type !== 'fill-blank' && question.type !== 'reorder'"
          class="word-prompt"
        >
          <h1>{{ prompt }}</h1>
          <button v-if="question.type !== 'ja-to-en'" aria-label="単語を再生" @click="speak">
            <Volume2 />
          </button>
        </div>

        <template v-if="isChoice">
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
              <Check v-if="revealed && option === correctValue" :size="18" />
              <RotateCcw
                v-if="revealed && selected === option && option !== correctValue"
                :size="17"
              />
            </button>
          </div>
        </template>

        <template v-else-if="question.type === 'flashcard'">
          <div class="flash-answer" :class="{ open: revealed }">
            <span v-if="!revealed">答えを思い出してみよう</span>
            <template v-else>
              <strong>{{ word.meaningJa }}</strong>
              <small>{{ word.partOfSpeech }} · {{ word.category }}</small>
            </template>
          </div>
          <button v-if="!revealed" class="primary" @click="revealCard">答えを見る</button>
          <div v-else class="self-rating">
            <button @click="rateCard(false)"><RotateCcw /> もう一度</button>
            <button @click="rateCard(true)"><Check /> 覚えていた</button>
          </div>
        </template>

        <form
          v-else-if="question.type === 'fill-blank'"
          class="fill-blank"
          @submit.prevent="checkFillBlank"
        >
          <p>{{ question.prompt }}</p>
          <label for="fill-answer">答えを入力</label>
          <div>
            <input
              id="fill-answer"
              v-model="fillAnswer"
              :disabled="revealed"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              inputmode="text"
            />
            <button class="primary" type="submit" :disabled="revealed || !fillAnswer.trim()">
              答え合わせ
            </button>
          </div>
        </form>

        <div v-else-if="question.type === 'reorder'" class="reorder-exercise">
          <p class="reorder-hint">
            <small>文の意味</small>
            {{ question.promptJa }}
          </p>
          <div class="ordered-tokens" aria-label="並べた単語">
            <span v-if="!placedTokens.length">下の単語を順番にタップ</span>
            <button
              v-for="token in placedTokens"
              :key="token.id"
              type="button"
              :disabled="revealed"
              :aria-label="`${token.text} を元に戻す`"
              @click="removeToken(token.id)"
            >
              {{ token.text }}
            </button>
          </div>
          <div class="token-bank" aria-label="並べ替える単語">
            <button
              v-for="token in availableTokens"
              :key="token.id"
              type="button"
              :disabled="revealed"
              :aria-label="`${token.text} を回答に追加`"
              @click="placeToken(token.id)"
            >
              {{ token.text }}
            </button>
          </div>
          <div class="reorder-actions">
            <button
              type="button"
              :disabled="revealed || !placedTokenIds.length"
              @click="resetOrder"
            >
              <RotateCcw :size="16" /> やり直す
            </button>
            <button
              class="primary"
              type="button"
              :disabled="revealed || placedTokenIds.length !== question.correctOrder?.length"
              @click="checkOrder"
            >
              答え合わせ
            </button>
          </div>
        </div>
      </main>
    </section>

    <div
      v-if="showOutcome"
      class="answer-outcome-overlay"
      :class="wasCorrect ? 'is-correct' : 'is-incorrect'"
    >
      <section
        ref="outcomePanel"
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby="answer-outcome-title"
        aria-describedby="answer-outcome-description"
        tabindex="-1"
      >
        <div class="outcome-burst" aria-hidden="true">
          <i v-for="index in 8" :key="index" />
        </div>
        <span class="outcome-icon" aria-hidden="true">
          <Check v-if="wasCorrect" />
          <RotateCcw v-else />
        </span>
        <p class="eyebrow">{{ wasCorrect ? 'WELL DONE!' : 'NICE TRY!' }}</p>
        <h2 id="answer-outcome-title">{{ wasCorrect ? '正解！' : 'おしい！' }}</h2>
        <p id="answer-outcome-description">
          {{
            wasCorrect ? 'その調子、しっかり身についてるよ。' : '大丈夫。答えを一緒に確認しよう。'
          }}
        </p>
        <div class="outcome-explanation">
          <p class="outcome-correct-answer">
            <small>正解</small>
            <strong>{{ correctAnswerDisplay }}</strong>
          </p>
          <div>
            <b
              >{{ word?.word }} <small>{{ word?.partOfSpeech }}</small></b
            >
            <p>{{ word?.meaningJa }}</p>
            <q>{{ word?.example }}</q>
            <small>{{ word?.exampleJa }}</small>
          </div>
        </div>
        <button type="button" @click="next">次の問題へ <ChevronRight /></button>
      </section>
    </div>

    <div v-if="showExitDialog" class="session-exit-modal">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-exit-title"
        aria-describedby="session-exit-description"
        @keydown="handleExitDialogKeydown"
      >
        <p class="eyebrow">LEAVE SESSION?</p>
        <h2 id="session-exit-title">学習を中断しますか？</h2>
        <p id="session-exit-description">
          <template v-if="session?.answers.length">
            回答済みの{{ session.answers.length }}問を記録して、結果画面を表示します。
          </template>
          <template v-else>まだ回答がないため、成績を記録せずに終了します。</template>
        </p>
        <div>
          <button ref="stayButton" type="button" @click="stayInSession">学習を続ける</button>
          <button ref="interruptButton" type="button" @click="confirmInterruption">
            {{ session?.answers.length ? '中断して結果を見る' : '中断して戻る' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
