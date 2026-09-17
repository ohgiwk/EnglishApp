<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, Check, Volume2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import {
  englishSpeechAvailable,
  getAmericanEnglishVoices,
  getAmericanVoicePreference,
  setAmericanVoicePreference,
  speakAmericanEnglish
} from '../speech'

const router = useRouter()
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoice = ref(getAmericanVoicePreference())
const loading = ref(englishSpeechAvailable())
const naturalVoice = (voice: SpeechSynthesisVoice) =>
  !/albert|bahh|bells|boing|bubbles|cellos|good news|bad news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo|rocko|sandy|shelley|kathy|fred|christopher|jenny|samantha/i.test(
    voice.name
  )
const femaleVoice =
  /google us english|allison|ava|victoria|nicky|joelle|susan|zira|aria|michelle|emma|joanna|ivy|kendra|kimberly|salli|olivia|ana|jill|nora/i
const maleVoice =
  /alex|aaron|nathan|michael|james|tom|david|mark|guy|eric|roger|matthew|joey|justin|kevin|brian|stephen/i
const displayVoiceName = (voice: SpeechSynthesisVoice) =>
  voice.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/Multilingual/i, '')
    .replace(/\s+Online.*$/i, '')
    .replace(/\s*[-–]\s*English.*$/i, '')
    .replace(/\s*\((?:Natural|Enhanced|Premium)\).*$/i, '')
    .replace(/^Google US English$/i, 'Google US')
    .trim()
const voiceQuality = (voice: SpeechSynthesisVoice) =>
  /natural/i.test(voice.name)
    ? 4
    : /premium|enhanced/i.test(voice.name)
      ? 3
      : /online/i.test(voice.name)
        ? 2
        : voice.localService
          ? 1
          : 0
const curatedVoices = (pattern: RegExp) => {
  const unique = new Map<string, SpeechSynthesisVoice>()
  for (const voice of voices.value.filter(
    (candidate) => naturalVoice(candidate) && pattern.test(candidate.name)
  )) {
    const key = displayVoiceName(voice).toLocaleLowerCase()
    const existing = unique.get(key)
    if (!existing || voiceQuality(voice) > voiceQuality(existing)) unique.set(key, voice)
  }
  return [...unique.values()].sort((a, b) =>
    displayVoiceName(a).localeCompare(displayVoiceName(b))
  )
}
const femaleVoices = computed(() => curatedVoices(femaleVoice))
const maleVoices = computed(() => curatedVoices(maleVoice))
const otherVoices = computed(() => {
  const categorized = new Set(
    [...femaleVoices.value, ...maleVoices.value].map((voice) => voice.voiceURI)
  )
  return voices.value.filter(
    (voice) => naturalVoice(voice) && !categorized.has(voice.voiceURI)
  )
})
const visibleVoiceIds = computed(() =>
  [...femaleVoices.value, ...maleVoices.value, ...otherVoices.value].map(
    (voice) => voice.voiceURI
  )
)

onMounted(async () => {
  voices.value = await getAmericanEnglishVoices()
  if (selectedVoice.value && !visibleVoiceIds.value.includes(selectedVoice.value)) {
    selectedVoice.value = ''
    setAmericanVoicePreference('')
  }
  loading.value = false
})

function chooseVoice(voiceId: string) {
  selectedVoice.value = voiceId
  setAmericanVoicePreference(voiceId)
  speakAmericanEnglish('Hello! Let’s practice English together.')
}

function previewVoice(voiceId: string) {
  if (selectedVoice.value !== voiceId) {
    selectedVoice.value = voiceId
    setAmericanVoicePreference(voiceId)
  }
  speakAmericanEnglish('Hello! Let’s practice English together.')
}
</script>

<template>
  <section class="page settings-page">
    <header class="settings-head">
      <button type="button" aria-label="ステータスへ戻る" @click="router.back()">
        <ArrowLeft />
      </button>
      <div>
        <p class="eyebrow">SETTINGS</p>
        <h1>設定</h1>
      </div>
    </header>

    <section class="settings-section">
      <div class="settings-title">
        <div>
          <p class="eyebrow">VOICE</p>
          <h2>読み上げ音声</h2>
        </div>
        <Volume2 />
      </div>
      <p>米国英語の読み上げに使う声を選択できます。選択するとサンプルを再生します。</p>

      <div class="voice-options" role="radiogroup" aria-label="読み上げ音声">
        <button
          type="button"
          role="radio"
          :aria-checked="selectedVoice === ''"
          :class="{ selected: selectedVoice === '' }"
          @click="chooseVoice('')"
        >
          <span><b>自動選択</b><small>おすすめの米国英語音声</small></span>
          <Check v-if="selectedVoice === ''" />
        </button>

        <template v-if="femaleVoices.length">
          <h3>女性の声</h3>
          <button
            v-for="voice in femaleVoices"
            :key="voice.voiceURI"
            type="button"
            role="radio"
            :aria-checked="selectedVoice === voice.voiceURI"
            :class="{ selected: selectedVoice === voice.voiceURI }"
            @click="chooseVoice(voice.voiceURI)"
          >
            <span><b>{{ displayVoiceName(voice) }}</b></span>
            <Check v-if="selectedVoice === voice.voiceURI" />
          </button>
        </template>

        <template v-if="maleVoices.length">
          <h3>男性の声</h3>
          <button
            v-for="voice in maleVoices"
            :key="voice.voiceURI"
            type="button"
            role="radio"
            :aria-checked="selectedVoice === voice.voiceURI"
            :class="{ selected: selectedVoice === voice.voiceURI }"
            @click="chooseVoice(voice.voiceURI)"
          >
            <span><b>{{ displayVoiceName(voice) }}</b></span>
            <Check v-if="selectedVoice === voice.voiceURI" />
          </button>
        </template>

        <template v-if="otherVoices.length">
          <h3>その他の声</h3>
          <button
            v-for="voice in otherVoices"
            :key="voice.voiceURI"
            type="button"
            role="radio"
            :aria-checked="selectedVoice === voice.voiceURI"
            :class="{ selected: selectedVoice === voice.voiceURI }"
            @click="chooseVoice(voice.voiceURI)"
          >
            <span><b>{{ displayVoiceName(voice) }}</b></span>
            <Check v-if="selectedVoice === voice.voiceURI" />
          </button>
        </template>
      </div>

      <p v-if="loading" class="voice-message">音声を読み込んでいます…</p>
      <p
        v-else-if="!femaleVoices.length && !maleVoices.length && !otherVoices.length"
        class="voice-message"
      >
        この端末の標準米国英語音声を使用します。
      </p>
      <button class="secondary voice-preview" type="button" @click="previewVoice(selectedVoice)">
        <Volume2 /> 選択中の声を試聴
      </button>
    </section>
  </section>
</template>
