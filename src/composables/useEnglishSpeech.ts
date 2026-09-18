import { onScopeDispose } from 'vue'
import {
  cancelEnglishSpeech,
  speakAmericanEnglish,
  speakAmericanEnglishAfterPause
} from '../speech'

export function useEnglishSpeech() {
  onScopeDispose(cancelEnglishSpeech)
  return {
    speak: speakAmericanEnglish,
    speakAfterPause: speakAmericanEnglishAfterPause,
    cancel: cancelEnglishSpeech
  }
}
