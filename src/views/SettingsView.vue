<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { ArrowLeft, Check, Volume2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import BaseDialog from '../components/BaseDialog.vue'
import { useAppStore } from '../stores/app'
import { useEnglishSpeech } from '../composables/useEnglishSpeech'
import { voiceGroups, displayVoiceName } from '../voice-catalog'
import {
  englishSpeechAvailable,
  getAmericanEnglishVoices,
  getAmericanVoicePreference,
  setAmericanVoicePreference
} from '../speech'

const { speak } = useEnglishSpeech()
const router = useRouter()
const store = useAppStore()
const showResetDialog = ref(false)
const resetError = ref(false)

function confirmReset() {
  resetError.value = false
  showResetDialog.value = true
}

function resetLearningData() {
  if (!store.reset()) {
    resetError.value = true
    return
  }
  showResetDialog.value = false
  void router.replace('/onboarding')
}
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoice = ref(getAmericanVoicePreference())
const loading = ref(englishSpeechAvailable())
const groups = computed(() => voiceGroups(voices.value))
const visibleVoiceIds = computed(() =>
  groups.value.flatMap((group) => group.voices.map((voice) => voice.voiceURI))
)
let active = true
onScopeDispose(() => {
  active = false
})

onMounted(async () => {
  const available = await getAmericanEnglishVoices()
  if (!active) return
  voices.value = available
  if (
    voices.value.length &&
    selectedVoice.value &&
    !visibleVoiceIds.value.includes(selectedVoice.value)
  ) {
    selectedVoice.value = ''
    setAmericanVoicePreference('')
  }
  loading.value = false
})

function chooseVoice(voiceId: string) {
  selectedVoice.value = voiceId
  setAmericanVoicePreference(voiceId)
  speak('Hello! Let’s practice English together.')
}

function previewVoice(voiceId: string) {
  if (selectedVoice.value !== voiceId) {
    selectedVoice.value = voiceId
    setAmericanVoicePreference(voiceId)
  }
  speak('Hello! Let’s practice English together.')
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

        <template v-for="group in groups" :key="group.label">
          <h3>{{ group.label }}</h3>
          <button
            v-for="voice in group.voices"
            :key="voice.voiceURI"
            type="button"
            role="radio"
            :aria-checked="selectedVoice === voice.voiceURI"
            :class="{ selected: selectedVoice === voice.voiceURI }"
            @click="chooseVoice(voice.voiceURI)"
          >
            <span
              ><b>{{ displayVoiceName(voice) }}</b></span
            >
            <Check v-if="selectedVoice === voice.voiceURI" />
          </button>
        </template>
      </div>

      <p v-if="loading" class="voice-message">音声を読み込んでいます…</p>
      <p v-else-if="!groups.length" class="voice-message">
        この端末の標準米国英語音声を使用します。
      </p>
      <button class="secondary voice-preview" type="button" @click="previewVoice(selectedVoice)">
        <Volume2 /> 選択中の声を試聴
      </button>
    </section>
    <section class="settings-section reset-section">
      <div class="settings-title">
        <div>
          <p class="eyebrow">LEARNING DATA</p>
          <h2>学習データのリセット</h2>
        </div>
      </div>
      <p>
        単語の学習履歴・成績・昇級試験・ストーリーの進行・親密度・経験値を削除し、名前やキャラクター選択も初期状態に戻します。読み上げ音声の設定は保持されます。
      </p>
      <button class="secondary reset-button" type="button" @click="confirmReset">
        学習データをリセット
      </button>
    </section>

    <BaseDialog
      v-if="showResetDialog"
      class="session-exit-modal"
      title-id="reset-title"
      description-id="reset-description"
      dismissible
      initial-focus="first"
      @close="showResetDialog = false"
    >
      <h2 id="reset-title">学習データをリセットしますか？</h2>
      <p id="reset-description">
        すべての学習履歴と進行状況、プロフィールを初期状態に戻します。この操作は取り消せません。
      </p>
      <p v-if="resetError" role="alert">
        リセットできませんでした。保存設定や空き容量を確認して、もう一度お試しください。
      </p>
      <div>
        <button type="button" @click="showResetDialog = false">キャンセル</button>
        <button type="button" @click="resetLearningData">リセットする</button>
      </div>
    </BaseDialog>
  </section>
</template>
