<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chapters } from '../data/chapters'
import { useAppStore } from '../stores/app'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { ArrowLeft, ChevronRight, Heart } from '@lucide/vue'
const route = useRoute(),
  router = useRouter(),
  store = useAppStore(),
  selected = ref<string | null>(null)
const chapter = computed(
  () => chapters.find((c) => c.id === Number(route.params.id)) || chapters[0]
)
const savedResult = computed(() => store.progress.answers[chapter.value.id])
const isReview = computed(() => Boolean(savedResult.value))
function previousComment() {
  router.push({ path: `/conversation/${chapter.value.id}`, query: { line: 'last' } })
}
function choose(id: string) {
  if (selected.value || isReview.value) return
  selected.value = id
  setTimeout(() => {
    const choice = chapter.value.scene.choices!.find((c) => c.id === id)!
    store.complete({ characterId: store.s.activeCharacterId, chapterId: chapter.value.id, choice })
    router.push(`/result/${chapter.value.id}`)
  }, 650)
}
</script>
<template>
  <section class="choice-page">
    <header>
      <button aria-label="前のコメントに戻る" @click="previousComment"><ArrowLeft /></button>
      <div>
        <small>CHAPTER {{ chapter.id }}</small
        ><b>あなたの返事</b>
      </div>
      <span>1 / 1</span>
    </header>
    <div class="choice-scene">
      <EmmaPortrait expression="normal" :src="chapter.image" />
      <div class="emma-question">
        “{{ chapter.scene.dialogues.at(-1)?.english }}”<small>{{
          chapter.scene.dialogues.at(-1)?.japanese
        }}</small>
      </div>
    </div>
    <div class="choices">
      <p>どう答える？ <span>英語の正しさだけが答えじゃない</span></p>
      <p v-if="isReview" class="choice-review-note" role="status">
        回答済みのチャプターです。選んだ回答を表示しています。
      </p>
      <button
        v-for="(c, i) in chapter.scene.choices"
        :key="c.id"
        :class="{ selected: selected === c.id || savedResult?.choice.id === c.id }"
        :disabled="isReview"
        @click="choose(c.id)"
      >
        <i>{{ String.fromCharCode(65 + i) }}</i
        ><span
          ><b>“{{ c.englishText }}”</b><small>{{ c.japaneseText }}</small></span
        ><Heart v-if="selected === c.id || savedResult?.choice.id === c.id" fill="currentColor" />
      </button>
      <button
        v-if="isReview"
        class="primary review-result"
        @click="router.push(`/result/${chapter.id}`)"
      >
        <span>
          <b>前回の学習結果を見る</b>
          <small>解説と獲得XPを確認</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
