<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { chapters } from '../data/chapters'
import { LockKeyhole, Check, ChevronRight, Heart } from '@lucide/vue'
import { computed } from 'vue'
const store = useAppStore()
const activeChapterId = computed(() =>
  store.s.activeStorySession?.characterId === store.s.activeCharacterId &&
  !store.s.activeStorySession.reviewOnly
    ? store.s.activeStorySession.chapterId
    : null
)
</script>
<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">STORY</p>
      <h1>ふたりの物語</h1>
      <p>言葉を交わすたび、少しずつ近づいていく。</p>
    </header>
    <div class="story-character">
      <img :src="store.activeCharacter.image" :alt="store.activeCharacter.name" />
      <div>
        <small>CURRENT CHARACTER</small
        ><b>{{ store.activeCharacter.name }} · {{ store.relationship }}</b>
      </div>
      <RouterLink to="/characters">キャラクター変更</RouterLink>
    </div>
    <RouterLink to="/character" class="story-character-link">
      <Heart :size="20" />
      <span
        ><b>{{ store.activeCharacter.name }}をもっと知る</b
        ><small>プロフィール・思い出を見る</small></span
      >
      <ChevronRight :size="18" />
    </RouterLink>
    <div class="chapter-list">
      <RouterLink
        v-for="c in chapters"
        :key="c.id"
        :to="`/conversation/${c.id}`"
        class="chapter-item"
        :class="{
          locked: c.id > store.currentChapter,
          done: store.progress.completed.includes(c.id),
          active: activeChapterId === c.id
        }"
        ><div class="chapter-visual" :style="{ background: c.color }">
          <img :src="c.image" :alt="c.title" /><span>{{ c.icon }}</span
          ><i>0{{ c.id }}</i>
        </div>
        <div class="chapter-info">
          <small>CHAPTER {{ c.id }}</small>
          <h2>{{ c.title }}</h2>
          <p>{{ c.subtitle }} · {{ c.theme }}</p>
          <span v-if="activeChapterId === c.id" class="available">CONTINUE STORY</span
          ><span v-else-if="store.progress.completed.includes(c.id)" class="complete"
            ><Check :size="14" /> CLEARED</span
          ><span v-else-if="c.id > store.currentChapter" class="lock"
            ><LockKeyhole :size="14" /> 開発プレビュー</span
          ><span v-else class="available">PLAY NOW</span>
        </div>
        <ChevronRight class="arrow"
      /></RouterLink>
    </div>
  </section>
</template>

<style scoped>
.story-character-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin: 12px 0 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: white;
  color: var(--pink);
  text-decoration: none;
}
.story-character-link span {
  flex: 1;
  min-width: 0;
}
.story-character-link b,
.story-character-link small {
  display: block;
}
.story-character-link b {
  font-size: 14px;
  color: #453f49;
}
.story-character-link small {
  margin-top: 4px;
  font-size: 12px;
  color: #7a737e;
}
</style>
