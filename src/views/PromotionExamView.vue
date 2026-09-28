<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { vocabularyWords } from '../data/vocabulary'
import ChoiceExercise from '../components/vocabulary/ChoiceExercise.vue'
import BaseDialog from '../components/BaseDialog.vue'
const store = useAppStore()
const route = useRoute()
const router = useRouter()
const level = computed(() => Number(route.params.level))
const session = computed(() => store.activeExam)
const question = computed(() => session.value?.questions[session.value.answers.length])
const word = computed(() => vocabularyWords.find((word) => word.id === question.value?.wordId))
const selected = ref('')
const showExit = ref(false)
let pendingExit: ((allow: boolean) => void) | undefined
function start() {
  store.startPromotionExam(level.value)
}
function confirm() {
  if (!session.value || !question.value || !selected.value) return
  const result = store.answerPromotionExam(
    session.value.id,
    session.value.answers.length,
    selected.value
  )
  selected.value = ''
  if (result) void router.replace('/learn/exam-result')
}
function stay() {
  showExit.value = false
  pendingExit?.(false)
  pendingExit = undefined
}
function leave() {
  store.cancelPromotionExam()
  showExit.value = false
  pendingExit?.(true)
  pendingExit = undefined
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (session.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => {
  if (!store.canTakeExam(level.value)) void router.replace('/learn')
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeRouteLeave(() => {
  if (!session.value) return true
  if (showExit.value) return false
  showExit.value = true
  return new Promise<boolean>((resolve) => {
    pendingExit = resolve
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  store.cancelPromotionExam()
  pendingExit?.(false)
})
</script>
<template>
  <section class="page exam-page">
    <h1>レベル{{ level }} 昇級試験</h1>
    <template v-if="question && session && word">
      <p>{{ session.answers.length + 1 }} / 20 問</p>
      <h2>{{ question.type === 'en-to-ja' ? word.word : word.meaningJa }}</h2>
      <p>{{ question.type === 'en-to-ja' ? '意味を選んでください' : '英単語を選んでください' }}</p>
      <ChoiceExercise
        :question="question"
        :selected="selected"
        :revealed="false"
        correct-answer=""
        @choose="selected = $event"
      />
      <button class="primary" :disabled="!selected" @click="confirm">
        回答を確定して{{ session.answers.length === 19 ? '結果を見る' : '次へ' }}
      </button>
      <RouterLink class="text-link" to="/learn">試験を中断する</RouterLink>
    </template>
    <template v-else-if="store.canTakeExam(level)">
      <div class="card exam-card">
        <p>
          英→日・日→英を各10問、合計20問出題します。18問以上正解するとレベル{{
            level + 1
          }}が解放されます。
        </p>
        <p>
          正解と発音は試験終了後に確認できます。通常の単語進捗・XP・関係値・学習実績には加算されません。
        </p>
        <p>中断・再読み込みすると回答は破棄されます。何度でも再受験できます。</p>
      </div>
      <button class="primary" @click="start">試験を開始する</button>
      <RouterLink class="text-link" to="/learn">Learnへ戻る</RouterLink>
    </template>
    <BaseDialog
      v-if="showExit"
      class="exam-overlay"
      panel-class="card exam-dialog"
      title-id="exam-exit-title"
      dismissible
      @close="stay"
    >
      <h2 id="exam-exit-title">試験を中断しますか？</h2>
      <p>回答は保存されません。次回は新しい問題で最初から受験できます。</p>
      <button class="primary" @click="stay">試験を続ける</button>
      <button class="secondary" @click="leave">中断する</button>
    </BaseDialog>
  </section>
</template>
