import { computed, ref, watch, type Ref } from 'vue'
import type { VocabularyQuestion, VocabularyWord } from '../types'
import { isCorrectReorder } from '../data/vocabulary-engine'

type ExerciseState =
  { phase: 'answering' | 'card-revealed' | 'committing' } | { phase: 'answered'; correct: boolean }

export function useVocabularyExercise(
  question: Ref<VocabularyQuestion | undefined>,
  word: Ref<VocabularyWord | undefined>,
  onAnswer: () => void,
  onCommit: (correct: boolean) => void
) {
  const state = ref<ExerciseState>({ phase: 'answering' })
  const selected = ref('')
  const fillAnswer = ref('')
  const placedTokenIds = ref<string[]>([])
  const revealed = computed(() => state.value.phase !== 'answering')
  const wasCorrect = computed(() => (state.value.phase === 'answered' ? state.value.correct : null))
  const showOutcome = computed(() => state.value.phase === 'answered')
  const tokens = computed(() => (question.value?.type === 'reorder' ? question.value.tokens : []))
  const availableTokens = computed(() =>
    tokens.value.filter((token) => !placedTokenIds.value.includes(token.id))
  )
  const placedTokens = computed(() =>
    placedTokenIds.value.flatMap((id) => tokens.value.filter((token) => token.id === id))
  )

  function reset() {
    state.value = { phase: 'answering' }
    selected.value = ''
    fillAnswer.value = ''
    placedTokenIds.value = []
  }
  watch(question, reset, { flush: 'sync' })
  function answered(correct: boolean) {
    state.value = { phase: 'answered', correct }
    onAnswer()
  }
  function choose(value: string) {
    const current = question.value
    if (
      revealed.value ||
      !current ||
      !word.value ||
      (current.type !== 'en-to-ja' && current.type !== 'ja-to-en') ||
      !current.options.includes(value)
    )
      return
    selected.value = value
    answered(value === (current.type === 'en-to-ja' ? word.value.meaningJa : word.value.word))
  }
  function revealCard() {
    if (!revealed.value && question.value?.type === 'flashcard')
      state.value = { phase: 'card-revealed' }
  }
  function checkFillBlank() {
    if (revealed.value || question.value?.type !== 'fill-blank' || !fillAnswer.value.trim()) return
    const normalize = (value: string) => value.trim().normalize('NFKC').toLowerCase()
    answered(normalize(fillAnswer.value) === normalize(question.value.answer))
  }
  function placeToken(id: string) {
    if (revealed.value || !availableTokens.value.some((token) => token.id === id)) return
    placedTokenIds.value.push(id)
  }
  function removeToken(id: string) {
    if (!revealed.value)
      placedTokenIds.value = placedTokenIds.value.filter((tokenId) => tokenId !== id)
  }
  function resetOrder() {
    if (!revealed.value) placedTokenIds.value = []
  }
  function checkOrder() {
    const current = question.value
    if (
      revealed.value ||
      current?.type !== 'reorder' ||
      placedTokenIds.value.length !== current.correctOrder.length
    )
      return
    answered(isCorrectReorder(current, placedTokenIds.value))
  }
  function commit(correct: boolean) {
    state.value = { phase: 'committing' }
    // Preserve the existing contract: record on Next, or on flashcard self-rating.
    onCommit(correct)
  }
  function next() {
    if (state.value.phase === 'answered') commit(state.value.correct)
  }
  function rateCard(correct: boolean) {
    if (question.value?.type === 'flashcard' && state.value.phase === 'card-revealed')
      commit(correct)
  }
  return {
    state,
    selected,
    fillAnswer,
    placedTokenIds,
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
  }
}
