<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { chapters } from '../data/chapters'
import { ArrowLeft, BookmarkCheck, Volume2, Trash2 } from '@lucide/vue'
const store = useAppStore()
const router = useRouter()
const fill = (value: string) => value.replaceAll('{{name}}', store.s.name)
const reviews = computed(() =>
  Object.values(store.progress.answers).flatMap((result) => {
    if (result.storyChoices?.length) {
      return result.storyChoices
        .map((choice) => ({
          id: `story:${result.chapterId}:${choice.pointId}`,
          chapterId: result.chapterId,
          expression: choice.naturalExpression,
          explanation: choice.learningCue.explanationJa,
          explanationEn: choice.learningCue.explanationEn
        }))
        .filter((item) => store.progress.reviews.includes(item.id))
    }
    return store.progress.reviews.includes(result.choice.id)
      ? [
          {
            id: result.choice.id,
            chapterId: result.chapterId,
            expression: result.choice.naturalExpression,
            explanation: result.choice.explanation,
            explanationEn: ''
          }
        ]
      : []
  })
)
</script>
<template>
  <section class="page">
    <header class="page-head subpage-head">
      <button aria-label="Learnへ戻る" @click="router.push('/learn')"><ArrowLeft /></button>
      <div>
        <p class="eyebrow">REVIEW</p>
        <h1>今日の復習</h1>
      </div>
      <p>{{ store.activeCharacter.name }}との会話で出会った表現を、あなたのペースで。</p>
    </header>
    <div v-if="!reviews.length" class="empty">
      <BookmarkCheck />
      <h2>復習リストはまだ空です</h2>
      <p>会話結果から、覚えたい英文を追加してみよう。</p>
      <RouterLink class="primary" to="/story">ストーリーを選ぶ</RouterLink>
    </div>
    <div v-else class="review-list">
      <article v-for="r in reviews" class="card">
        <div>
          <small>CHAPTER {{ r.chapterId }}</small
          ><button><Volume2 /></button>
        </div>
        <h2>{{ fill(r.expression) }}</h2>
        <p>{{ r.explanation }}</p>
        <small v-if="r.explanationEn">{{ r.explanationEn }}</small>
        <button class="remove" @click="store.toggleReview(r.id)"><Trash2 /> リストから外す</button>
      </article>
    </div>
    <div class="expressions">
      <h3>学んだ表現</h3>
      <p v-for="c in chapters.filter((c) => store.progress.completed.includes(c.id))" :key="c.id">
        <b>{{ c.title }}</b
        ><span>{{ c.expressions.length }} expressions</span>
      </p>
    </div>
  </section>
</template>
