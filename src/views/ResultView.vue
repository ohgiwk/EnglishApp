<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { chapters } from '../data/chapters'
import { useAppStore } from '../stores/app'
import { Sparkles, Heart, ShieldCheck, Bookmark, BookOpen, ChevronRight, Home } from '@lucide/vue'
const route = useRoute(),
  store = useAppStore()
const id = Number(route.params.id)
const chapter = computed(() => chapters.find((c) => c.id === id)!)
const result = computed(() => store.progress.answers[id])
const reviewId = computed(() => result.value?.choice.id || '')
const storyChoices = computed(() => result.value?.storyChoices ?? [])
const totalXp = computed(() => result.value?.totalEnglishXp ?? result.value?.choice.englishXp ?? 0)
const totalAffection = computed(
  () => result.value?.totalAffectionChange ?? result.value?.choice.affectionChange ?? 0
)
const totalTrust = computed(
  () => result.value?.totalTrustChange ?? result.value?.choice.trustChange ?? 0
)
const storyReviewId = (pointId: string) => `story:${id}:${pointId}`
const fill = (value: string) => value.replaceAll('{{name}}', store.s.name)
const nextChapter = computed(() => {
  const currentIndex = chapters.findIndex((item) => item.id === id)
  const candidate = chapters[currentIndex + 1]
  return candidate && candidate.id <= store.currentChapter ? candidate : null
})
</script>
<template>
  <section v-if="result" class="page result">
    <div class="clear">
      <Sparkles /><small>CHAPTER {{ id }} COMPLETE</small>
      <h1>Nice work, {{ store.s.name }}!</h1>
      <p>今日も一歩、英語と{{ store.activeCharacter.name }}に近づきました。</p>
      <div class="xp">+{{ totalXp }} <small>ENGLISH XP</small></div>
    </div>
    <div class="reaction">
      <img :src="chapter.image" :alt="chapter.title" />
      <div>
        <b>{{ store.activeCharacter.englishName.split(' ')[0] }}</b>
        <p>“{{ chapter.scene.closing.at(-1)?.english }}”</p>
        <small>{{ chapter.scene.closing.at(-1)?.japanese }}</small>
      </div>
    </div>
    <div class="delta">
      <span
        ><Heart /> Affection - 愛情
        <b :class="{ minus: totalAffection < 0 }"
          >{{ totalAffection > 0 ? '+' : '' }}{{ totalAffection }}</b
        ></span
      ><span
        ><ShieldCheck /> Trust - 信頼
        <b :class="{ minus: totalTrust < 0 }"
          >{{ totalTrust > 0 ? '+' : '' }}{{ totalTrust }}</b
        ></span
      >
    </div>
    <div v-if="storyChoices.length" class="story-result-choices">
      <p class="eyebrow">TODAY'S REVIEW</p>
      <h2>3つの選択で学んだこと</h2>
      <article v-for="(item, index) in storyChoices" :key="item.pointId" class="card lesson">
        <small>CHOICE {{ index + 1 }}</small>
        <h3>{{ item.learningCue.title }}</h3>
        <label>あなたの回答</label>
        <p class="chosen-expression">“{{ fill(item.englishText) }}”</p>
        <label>自然な表現</label>
        <p class="natural">“{{ fill(item.naturalExpression) }}”</p>
        <strong>{{ item.learningCue.construction }}</strong>
        <p>{{ item.learningCue.explanationJa }}</p>
        <small>{{ item.learningCue.explanationEn }}</small>
        <div class="impression">
          <b>{{ store.activeCharacter.name }}への印象</b>{{ item.feedback }}
        </div>
        <button
          class="story-review-toggle"
          type="button"
          @click="store.toggleReview(storyReviewId(item.pointId))"
        >
          <Bookmark
            :fill="
              store.progress.reviews.includes(storyReviewId(item.pointId)) ? 'currentColor' : 'none'
            "
          />
          {{
            store.progress.reviews.includes(storyReviewId(item.pointId))
              ? '復習に追加済み'
              : 'この表現を復習'
          }}
        </button>
      </article>
    </div>
    <div v-else class="card lesson">
      <p class="eyebrow">TODAY'S REVIEW</p>
      <label>あなたの回答</label>
      <h3>“{{ result.choice.englishText }}”</h3>
      <label>より自然な表現</label>
      <h3 class="natural">“{{ result.choice.naturalExpression }}”</h3>
      <p>{{ result.choice.explanation }}</p>
      <div class="impression">
        <b>{{ store.activeCharacter.name }}への印象</b>{{ result.choice.feedback }}
      </div>
    </div>
    <div class="card words">
      <h3>覚えておきたい言葉</h3>
      <span v-for="w in chapter.words">{{ w }}</span>
    </div>
    <button v-if="!storyChoices.length" class="secondary" @click="store.toggleReview(reviewId)">
      <Bookmark :fill="store.progress.reviews.includes(reviewId) ? 'currentColor' : 'none'" />{{
        store.progress.reviews.includes(reviewId) ? '復習リストに追加済み' : '復習リストに追加'
      }}</button
    ><RouterLink class="primary" :to="nextChapter ? `/conversation/${nextChapter.id}` : '/story'">
      <template v-if="nextChapter">次のチャプターへ <ChevronRight /></template>
      <template v-else><BookOpen />チャプター一覧へ</template> </RouterLink
    ><RouterLink class="text-link" to="/home"><Home />ホームへ戻る</RouterLink>
  </section>
</template>
