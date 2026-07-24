<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chapters } from '../data/chapters'
import { useAppStore } from '../stores/app'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { Languages, Volume2, ScrollText, X, ChevronLeft, ChevronRight } from '@lucide/vue'
const route = useRoute(),
  router = useRouter(),
  store = useAppStore(),
  idx = ref(route.query.line === 'last' ? Number.MAX_SAFE_INTEGER : 0),
  log = ref(false)
const chapter = computed(
  () => chapters.find((c) => c.id === Number(route.params.id)) || chapters[0]
)
const lines = computed(() => chapter.value.scene.dialogues)
const line = computed(() => lines.value[idx.value])
const speakerClass = (speaker: 'Emma' | 'Player') =>
  speaker === 'Emma' ? 'speaker-character' : 'speaker-player'
const fill = (s: string) => s.replaceAll('{{name}}', store.s.name)
if (idx.value === Number.MAX_SAFE_INTEGER) idx.value = Math.max(0, lines.value.length - 1)
function previous() {
  if (idx.value > 0) idx.value--
}
function next() {
  if (idx.value < lines.value.length - 1) idx.value++
  else router.push(`/choice/${chapter.value.id}`)
}
</script>
<template>
  <section
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
        <button aria-label="会話ログを開く" @click="log = true"><ScrollText /></button>
      </div>
    </header>
    <div class="scene-label">International Share House · {{ chapter.theme }}</div>
    <EmmaPortrait :expression="line.expression || 'normal'" :src="chapter.image" full />
    <div
      class="dialog-box"
      :class="speakerClass(line.speaker)"
      role="button"
      tabindex="0"
      aria-label="次の会話へ進む"
      @click="next"
      @keyup.enter="next"
      @keyup.space.prevent="next"
    >
      <div class="speaker">
        {{ line.speaker === 'Emma' ? store.activeCharacter.englishName : store.s.name }}
      </div>
      <button class="sound" @click.stop><Volume2 /></button>
      <h2>{{ fill(line.english) }}</h2>
      <p v-if="store.s.showTranslation">{{ fill(line.japanese) }}</p>
      <div class="dialog-navigation">
        <button
          type="button"
          :disabled="idx === 0"
          aria-label="前のコメントに戻る"
          @click.stop="previous"
          @keyup.stop
        >
          <ChevronLeft /> 前のコメント
        </button>
        <span class="continue">TAP TO CONTINUE <ChevronRight /></span>
      </div>
    </div>
    <div v-if="log" class="modal" @click.self="log = false">
      <div class="log-card">
        <button class="modal-close" @click="log = false"><X /></button>
        <h2>Conversation log</h2>
        <div v-for="(d, i) in lines.slice(0, idx + 1)" :key="i" :class="speakerClass(d.speaker)">
          <b>{{
            d.speaker === 'Emma' ? store.activeCharacter.englishName.split(' ')[0] : store.s.name
          }}</b>
          <p>{{ fill(d.english) }}</p>
          <small>{{ fill(d.japanese) }}</small>
        </div>
      </div>
    </div>
  </section>
</template>
