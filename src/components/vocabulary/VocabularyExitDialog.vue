<script setup lang="ts">
import BaseDialog from '../BaseDialog.vue'
defineProps<{ answeredCount: number }>()
const emit = defineEmits<{ stay: []; interrupt: [] }>()
</script>
<template>
  <BaseDialog
    class="session-exit-modal"
    title-id="session-exit-title"
    description-id="session-exit-description"
    dismissible
    initial-focus="first"
    @close="emit('stay')"
  >
    <p class="eyebrow">LEAVE SESSION?</p>
    <h2 id="session-exit-title">学習を中断しますか？</h2>
    <p id="session-exit-description">
      <template v-if="answeredCount">
        回答済みの{{ answeredCount }}問を記録して、結果画面を表示します。
      </template>
      <template v-else>まだ回答がないため、成績を記録せずに終了します。</template>
    </p>
    <div>
      <button type="button" @click="emit('stay')">学習を続ける</button>
      <button type="button" @click="emit('interrupt')">
        {{ answeredCount ? '中断して結果を見る' : '中断して戻る' }}
      </button>
    </div>
  </BaseDialog>
</template>
