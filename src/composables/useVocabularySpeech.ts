import { computed, ref, watch, type Ref } from 'vue'
import type { VocabularyQuestion, VocabularyWord } from '../types'
import { vocabularyPresentation } from '../domain/vocabulary-presentation'
import { useEnglishSpeech } from './useEnglishSpeech'

export function useVocabularySpeech(
  question: Ref<VocabularyQuestion | undefined>,
  word: Ref<VocabularyWord | undefined>
) {
  const speech = useEnglishSpeech()
  const muted = ref(false)
  const presentation = computed(() =>
    question.value && word.value ? vocabularyPresentation(question.value, word.value) : null
  )
  watch(
    question,
    () => {
      speech.cancel()
      const text = presentation.value?.questionSpeech
      if (!muted.value && text) speech.speakAfterPause(text)
    },
    { immediate: true, flush: 'sync' }
  )
  function answer() {
    const text = presentation.value?.answerSpeech
    if (!muted.value && text) void speech.speak(text)
  }
  function replay(answered: boolean) {
    const text = answered
      ? (presentation.value?.answerSpeech ?? presentation.value?.questionSpeech)
      : presentation.value?.questionSpeech
    if (text) void speech.speak(text)
  }
  function toggleMute() {
    muted.value = !muted.value
    if (muted.value) speech.cancel()
  }
  return { muted, presentation, answer, replay, toggleMute }
}
