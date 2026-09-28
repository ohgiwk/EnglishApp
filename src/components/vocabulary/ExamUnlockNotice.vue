<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import BaseDialog from '../BaseDialog.vue'
const props = defineProps<{ level?: number }>()
const store = useAppStore()
const show = ref(false)
watch(
  () => props.level,
  (level) => {
    if (level && store.canTakeExam(level) && !store.s.notifiedExamLevels.includes(level)) {
      show.value = true
      store.acknowledgeExamNotification(level)
    }
  },
  { immediate: true }
)
</script>
<template>
  <div v-if="level && store.canTakeExam(level)" class="card exam-card" role="status">
    <h2>昇級試験が解放されました</h2>
    <p>
      レベル{{
        level
      }}の単語の70%を学習済みにしました。20問中18問以上の正解で次のレベルが解放されます。
    </p>
    <RouterLink class="primary" :to="`/learn/exam/${level}`">試験を受ける</RouterLink>
  </div>
  <BaseDialog
    v-if="show"
    class="exam-overlay"
    panel-class="card exam-dialog"
    title-id="exam-unlocked-title"
    dismissible
    @close="show = false"
  >
    <h2 id="exam-unlocked-title">昇級試験が解放されました</h2>
    <p>
      レベル{{ level }}の昇級試験を受けられます。20問中18問以上の正解で次のレベルが解放されます。
    </p>
    <RouterLink class="primary" :to="`/learn/exam/${level}`" @click="show = false"
      >試験を受ける</RouterLink
    >
    <button class="secondary" @click="show = false">あとで</button>
  </BaseDialog>
</template>
