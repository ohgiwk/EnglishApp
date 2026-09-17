<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BookOpen,
  Check,
  Edit3,
  Flame,
  Save,
  Settings,
  Star,
  Target,
  Trophy,
  X
} from '@lucide/vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const editing = ref(false)
const draftName = ref(store.s.name)
const today = new Date().toLocaleDateString('sv-SE')
const selectedDate = ref(today)

const level = computed(() => {
  const xp = store.s.xp
  if (xp < 50) return { name: 'Beginner A1', start: 0, next: 50, percent: (xp / 50) * 100 }
  if (xp < 120)
    return { name: 'Elementary A2', start: 50, next: 120, percent: ((xp - 50) / 70) * 100 }
  return { name: 'Pre-intermediate B1', start: 120, next: null, percent: 100 }
})
const calendarDays = computed(() =>
  Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    const key = date.toLocaleDateString('sv-SE')
    return { key, day: date.getDate(), weekday: date.getDay(), stats: store.s.dailyStudyStats[key] }
  })
)
const leadingBlanks = computed(() => calendarDays.value[0]?.weekday ?? 0)
const selectedStats = computed(() => store.s.dailyStudyStats[selectedDate.value])
const vocabularyPercent = computed(() => Math.round((store.masteredVocabularyCount / 1000) * 100))
const intensity = (xp = 0) => (xp === 0 ? 0 : xp <= 10 ? 1 : xp <= 25 ? 2 : 3)

function beginEdit() {
  draftName.value = store.s.name
  editing.value = true
}
function saveName() {
  if (!draftName.value.trim()) return
  store.setName(draftName.value)
  editing.value = false
}
</script>

<template>
  <section class="page status-page">
    <header class="status-profile">
      <div class="player-mark">{{ store.s.name.slice(0, 1).toUpperCase() }}</div>
      <div v-if="!editing">
        <p class="eyebrow">MY STATUS</p>
        <h1>{{ store.s.name }}</h1>
        <span>{{ level.name }}</span>
      </div>
      <div v-else class="name-editor">
        <label for="player-name">PLAYER NAME</label>
        <input id="player-name" v-model="draftName" maxlength="12" @keyup.enter="saveName" />
      </div>
      <div v-if="!editing" class="status-actions">
        <RouterLink to="/settings" aria-label="設定"><Settings /></RouterLink>
        <button aria-label="名前を編集" @click="beginEdit"><Edit3 /></button>
      </div>
      <div v-else class="edit-actions">
        <button aria-label="キャンセル" @click="editing = false"><X /></button>
        <button aria-label="保存" :disabled="!draftName.trim()" @click="saveName"><Save /></button>
      </div>
    </header>

    <div class="xp-status">
      <div>
        <Star fill="currentColor" /><span
          ><small>ENGLISH XP</small><strong>{{ store.s.xp }}</strong></span
        >
      </div>
      <p v-if="level.next">
        次のレベルまで <b>{{ level.next - store.s.xp }} XP</b>
      </p>
      <p v-else>現在の最高レベルに到達しました</p>
      <i><u :style="{ width: `${level.percent}%` }" /></i>
    </div>

    <div class="status-highlights">
      <div>
        <Flame /><b>{{ store.s.studyDays }}</b
        ><span>累積学習日数</span>
      </div>
      <div>
        <Trophy /><b>{{ store.totalCompletedChapters }}</b
        ><span>完了チャプター</span>
      </div>
      <div>
        <Target /><b>{{ store.lifetimeAccuracy }}%</b><span>累積正答率</span>
      </div>
    </div>

    <section class="status-section">
      <div class="status-title">
        <div>
          <p class="eyebrow">VOCABULARY</p>
          <h2>単語の習得状況</h2>
        </div>
        <strong>{{ vocabularyPercent }}%</strong>
      </div>
      <div class="vocab-distribution">
        <i><u :style="{ width: `${vocabularyPercent}%` }" /></i>
        <div>
          <span
            ><b>{{ store.masteredVocabularyCount }}</b
            >習得済み</span
          ><span
            ><b>{{ store.learningVocabularyCount }}</b
            >学習中</span
          ><span
            ><b>{{ store.newVocabularyCount }}</b
            >未学習</span
          >
        </div>
      </div>
    </section>

    <section class="status-section">
      <div class="status-title">
        <div>
          <p class="eyebrow">ALL-TIME STATS</p>
          <h2>これまでの学び</h2>
        </div>
      </div>
      <div class="lifetime-grid">
        <div>
          <BookOpen /><b>{{ store.s.lifetimeStudyStats.storySessions }}</b
          ><span>Story sessions</span>
        </div>
        <div>
          <Star /><b>{{ store.s.lifetimeStudyStats.vocabularySessions }}</b
          ><span>Word sessions</span>
        </div>
        <div>
          <Target /><b>{{ store.s.lifetimeStudyStats.questionsAnswered }}</b
          ><span>Questions</span>
        </div>
        <div>
          <Check /><b>{{ store.s.lifetimeStudyStats.correctAnswers }}</b
          ><span>Correct</span>
        </div>
      </div>
      <p class="review-count">
        選択中キャラクターの復習：<b>{{ store.progress.reviews.length }}件</b>
      </p>
    </section>

    <section class="status-section calendar-section">
      <div class="status-title">
        <div>
          <p class="eyebrow">LAST 30 DAYS</p>
          <h2>学習カレンダー</h2>
        </div>
      </div>
      <div class="calendar-weekdays">
        <span v-for="day in ['日', '月', '火', '水', '木', '金', '土']" :key="day">{{ day }}</span>
      </div>
      <div class="study-calendar">
        <i v-for="blank in leadingBlanks" :key="`blank-${blank}`" />
        <button
          v-for="day in calendarDays"
          :key="day.key"
          :class="[
            `level-${intensity(day.stats?.xpEarned)}`,
            { today: day.key === today, selected: day.key === selectedDate }
          ]"
          :title="`${day.key}: ${day.stats?.xpEarned ?? 0} XP`"
          @click="selectedDate = day.key"
        >
          {{ day.day }}
        </button>
      </div>
      <div class="calendar-legend">
        <span>少ない</span><i class="level-0" /><i class="level-1" /><i class="level-2" /><i
          class="level-3"
        /><span>多い</span>
      </div>
      <div class="day-detail">
        <b>{{ selectedDate }}</b>
        <template v-if="selectedStats">
          <span>{{ selectedStats.xpEarned }} XP</span>
          <span>Story {{ selectedStats.storySessions }}</span>
          <span>Words {{ selectedStats.vocabularySessions }}</span>
          <span
            >{{
              selectedStats.questionsAnswered
                ? Math.round((selectedStats.correctAnswers / selectedStats.questionsAnswered) * 100)
                : 0
            }}% correct</span
          >
        </template>
        <span v-else>学習記録はありません</span>
      </div>
    </section>
  </section>
</template>
