<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chapters } from '../data/chapters'
import { useAppStore } from '../stores/app'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import { ArrowLeft, Heart } from '@lucide/vue'
const route = useRoute(),
  router = useRouter(),
  store = useAppStore(),
  selected = ref<string | null>(null)
const chapter = computed(
  () => chapters.find((c) => c.id === Number(route.params.id)) || chapters[0]
)
function choose(id: string) {
  if (selected.value) return
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
      <button @click="router.back"><ArrowLeft /></button>
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
      <button
        v-for="(c, i) in chapter.scene.choices"
        :key="c.id"
        :class="{ selected: selected === c.id }"
        @click="choose(c.id)"
      >
        <i>{{ String.fromCharCode(65 + i) }}</i
        ><span
          ><b>“{{ c.englishText }}”</b><small>{{ c.japaneseText }}</small></span
        ><Heart v-if="selected === c.id" fill="currentColor" />
      </button>
    </div>
  </section>
</template>
