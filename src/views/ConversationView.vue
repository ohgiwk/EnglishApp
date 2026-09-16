<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronLeft, ChevronRight, Languages, ScrollText, Volume2, X } from '@lucide/vue'
import { chapters } from '../data/chapters'
import { getStoryFlow } from '../data/story-flows'
import { choiceResultFor, storyArtworkStage } from '../data/story-engine'
import { useAppStore } from '../stores/app'
import type { Dialogue } from '../types'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const logOpen = ref(false)
const feedbackPanel = ref<HTMLElement | null>(null)
const chapter = computed(
  () => chapters.find((candidate) => candidate.id === Number(route.params.id)) || chapters[0]
)
const flow = computed(() => getStoryFlow(chapter.value.id))
const session = computed(() => {
  const active = store.s.activeStorySession
  return active?.chapterId === chapter.value.id && active.characterId === store.s.activeCharacterId
    ? active
    : null
})
const node = computed(() => {
  const active = session.value
  return active ? flow.value?.nodes[active.currentNodeId] : undefined
})
const dialogue = computed(() => (node.value?.type === 'dialogue' ? node.value.dialogue : null))
const choice = computed(() => (node.value?.type === 'choice' ? node.value : null))
const storyPose = computed(() => {
  const stage = storyArtworkStage(node.value?.id ?? '')
  if (stage === 'middle') return chapter.value.storyArtwork.middle
  if (stage === 'late') return chapter.value.storyArtwork.late
  return chapter.value.storyArtwork.early
})
const selectedAtChoice = computed(() =>
  choice.value
    ? session.value?.selections.find((selection) => selection.pointId === choice.value?.id)
    : undefined
)
const feedback = computed(() => {
  const active = session.value
  if (!active) return null
  const pending = active.selections.find(
    (selection) => !active.acknowledgedChoiceIds.includes(selection.pointId)
  )
  return pending ? choiceResultFor(flow.value, pending) : null
})
const visibleLog = computed(() => {
  const active = session.value
  if (!active) return []
  const ids = [...active.history, active.currentNodeId]
  return ids
    .map((id) => flow.value?.nodes[id])
    .filter((item) => item?.type === 'dialogue')
    .map((item) => (item?.type === 'dialogue' ? item.dialogue : null))
    .filter((item): item is Dialogue => item !== null)
})
const speakerClass = (speaker: 'Emma' | 'Player') =>
  speaker === 'Emma' ? 'speaker-character' : 'speaker-player'
const fill = (value: string) => value.replaceAll('{{name}}', store.s.name)

onMounted(() => {
  if (!store.startStorySession(chapter.value.id)) {
    void router.replace('/story')
    return
  }
  Object.values(chapter.value.storyArtwork).forEach((src) => {
    const image = new Image()
    image.src = src
  })
  finishIfNeeded()
  if (feedback.value) void nextTick(() => feedbackPanel.value?.focus())
})

function finishIfNeeded() {
  if (node.value?.type !== 'ending') return
  const result = store.completeStorySession()
  if (result) void router.replace(`/result/${chapter.value.id}`)
}

function next() {
  if (node.value?.type !== 'dialogue' || feedback.value) return
  store.advanceStoryNode()
  finishIfNeeded()
}

function previous() {
  if (feedback.value) return
  store.previousStoryNode()
}

function selectOption(optionId: string) {
  if (!choice.value || selectedAtChoice.value) return
  if (store.chooseStoryOption(choice.value.id, optionId)) {
    void nextTick(() => feedbackPanel.value?.focus())
  }
}

function continueSavedChoice() {
  if (!choice.value || !selectedAtChoice.value) return
  store.continueReviewedStoryChoice()
}

function acknowledgeFeedback() {
  if (!feedback.value) return
  store.acknowledgeStoryChoice(feedback.value.pointId)
}

function handleFeedbackKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !feedbackPanel.value) return
  const controls = Array.from(
    feedbackPanel.value.querySelectorAll<HTMLElement>('button:not([disabled]), [href]')
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === feedbackPanel.value)
  ) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(fill(text)))
}
</script>

<template>
  <section
    v-if="session && node"
    class="conversation"
    :style="{
      '--speaker-character': store.activeCharacter.accent,
      '--speaker-character-ink': '#7a2948'
    }"
  >
    <header>
      <button aria-label="チャプター選択へ戻る" @click="router.push('/story')"><X /></button>
      <span class="chapter-title">CHAPTER {{ chapter.id }}</span>
      <div class="conversation-actions">
        <button
          class="translation-toggle"
          :class="{ active: store.s.showTranslation }"
          aria-label="日本語表示を切り替える"
          @click="store.toggleTranslation"
        >
          <Languages />
        </button>
        <button aria-label="会話ログを開く" @click="logOpen = true"><ScrollText /></button>
      </div>
    </header>
    <div class="scene-label">
      International Share House · {{ chapter.theme }}
      <small v-if="session.reviewOnly">保存したストーリーを振り返り中</small>
    </div>
    <div class="story-artwork" aria-hidden="true">
      <img class="story-background" :src="chapter.storyArtwork.background" alt="" />
      <img class="story-pose" :src="storyPose" alt="" />
    </div>

    <div
      v-if="dialogue"
      class="dialog-box"
      :class="speakerClass(dialogue.speaker)"
      :inert="feedback ? true : undefined"
      role="button"
      tabindex="0"
      aria-label="次の会話へ進む"
      @click="next"
      @keyup.enter="next"
      @keyup.space.prevent="next"
    >
      <div class="speaker">
        {{ dialogue.speaker === 'Emma' ? store.activeCharacter.englishName : store.s.name }}
      </div>
      <button
        class="sound"
        :aria-label="`${fill(dialogue.english)}を再生`"
        @click.stop="speak(dialogue.english)"
      >
        <Volume2 />
      </button>
      <h2>{{ fill(dialogue.english) }}</h2>
      <p v-if="store.s.showTranslation">{{ fill(dialogue.japanese) }}</p>
      <div class="dialog-navigation">
        <button
          type="button"
          :disabled="!session.history.length"
          aria-label="前のコメントに戻る"
          @click.stop="previous"
          @keyup.stop
        >
          <ChevronLeft /> 前のコメント
        </button>
        <span class="continue">TAP TO CONTINUE <ChevronRight /></span>
      </div>
    </div>

    <section v-else-if="choice" class="story-choice-card" aria-labelledby="story-choice-title">
      <p class="eyebrow">YOUR CHOICE</p>
      <h1 id="story-choice-title">{{ choice.promptEnglish }}</h1>
      <p v-if="store.s.showTranslation">{{ choice.promptJapanese }}</p>
      <div class="story-choice-options">
        <button
          v-for="option in choice.options"
          :key="option.id"
          type="button"
          :class="{ selected: selectedAtChoice?.optionId === option.id }"
          :aria-pressed="selectedAtChoice?.optionId === option.id"
          :disabled="Boolean(selectedAtChoice)"
          @click="selectOption(option.id)"
        >
          <span>
            <b>{{ fill(option.englishText) }}</b>
            <small v-if="store.s.showTranslation">{{ fill(option.japaneseText) }}</small>
          </span>
          <Check v-if="selectedAtChoice?.optionId === option.id" />
        </button>
      </div>
      <button
        v-if="selectedAtChoice"
        class="primary story-choice-continue"
        type="button"
        @click="continueSavedChoice"
      >
        選んだ回答で続きを見る <ChevronRight />
      </button>
      <button
        class="story-choice-back"
        type="button"
        :disabled="!session.history.length"
        @click="previous"
      >
        <ChevronLeft /> 前のコメント
      </button>
    </section>

    <div v-if="feedback" class="story-learning-overlay">
      <section
        ref="feedbackPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-learning-title"
        aria-describedby="story-learning-description"
        tabindex="-1"
        @keydown="handleFeedbackKeydown"
      >
        <p class="eyebrow">LEARNING POINT</p>
        <h2 id="story-learning-title">{{ feedback.learningCue.title }}</h2>
        <strong>{{ feedback.learningCue.construction }}</strong>
        <p>{{ fill(feedback.feedback) }}</p>
        <p id="story-learning-description">{{ feedback.learningCue.explanationJa }}</p>
        <small>{{ feedback.learningCue.explanationEn }}</small>
        <div class="story-learning-expression">
          <span>自然な表現</span>
          <b>{{ fill(feedback.naturalExpression) }}</b>
          <button
            type="button"
            aria-label="自然な表現を再生"
            @click="speak(feedback.naturalExpression)"
          >
            <Volume2 />
          </button>
        </div>
        <button class="primary" type="button" @click="acknowledgeFeedback">
          会話を続ける <ChevronRight />
        </button>
      </section>
    </div>

    <div v-if="logOpen" class="modal" @click.self="logOpen = false">
      <div class="log-card">
        <button class="modal-close" aria-label="会話ログを閉じる" @click="logOpen = false">
          <X />
        </button>
        <h2>Conversation log</h2>
        <div v-for="(item, index) in visibleLog" :key="index" :class="speakerClass(item.speaker)">
          <b>{{
            item.speaker === 'Emma' ? store.activeCharacter.englishName.split(' ')[0] : store.s.name
          }}</b>
          <p>{{ fill(item.english) }}</p>
          <small>{{ fill(item.japanese) }}</small>
        </div>
      </div>
    </div>
  </section>
</template>
