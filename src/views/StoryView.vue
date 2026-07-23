<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { chapters } from '../data/chapters'
import { LockKeyhole, Check, ChevronRight } from '@lucide/vue'
const store = useAppStore()
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
    <div class="chapter-list">
      <RouterLink
        v-for="c in chapters"
        :key="c.id"
        :to="`/conversation/${c.id}`"
        class="chapter-item"
        :class="{
          locked: c.id > store.currentChapter,
          done: store.progress.completed.includes(c.id)
        }"
        ><div class="chapter-visual" :style="{ background: c.color }">
          <img :src="c.image" :alt="c.title" /><span>{{ c.icon }}</span
          ><i>0{{ c.id }}</i>
        </div>
        <div class="chapter-info">
          <small>CHAPTER {{ c.id }}</small>
          <h2>{{ c.title }}</h2>
          <p>{{ c.subtitle }} · {{ c.theme }}</p>
          <span v-if="store.progress.completed.includes(c.id)" class="complete"
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
