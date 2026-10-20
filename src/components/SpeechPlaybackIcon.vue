<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle, Volume2 } from '@lucide/vue'
import { speechPlayback } from '../speech-playback'
const props = defineProps<{ text: string }>()
const phase = computed(() =>
  speechPlayback.value?.text === props.text ? speechPlayback.value.phase : null
)
</script>
<template>
  <span
    class="speech-playback-icon"
    :class="phase"
    :role="phase ? 'status' : undefined"
    :aria-label="phase === 'loading' ? '読み込み中' : phase === 'playing' ? '再生中' : undefined"
  >
    <LoaderCircle v-if="phase === 'loading'" :size="16" aria-hidden="true" />
    <span v-else-if="phase === 'playing'" class="speech-wave" aria-hidden="true"
      ><i /><i /><i /><i
    /></span>
    <Volume2 v-else :size="16" aria-hidden="true" />
  </span>
</template>
<style>
.speech-playback-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.speech-playback-icon.loading > svg {
  animation: speech-loading 0.8s linear infinite;
}
.speech-wave {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 16px;
}
.speech-wave i {
  width: 2px;
  height: 12px;
  border-radius: 2px;
  background: currentColor;
  animation: speech-wave 0.65s ease-in-out infinite alternate;
}
.speech-wave i:nth-child(2) {
  animation-delay: -0.3s;
}
.speech-wave i:nth-child(3) {
  animation-delay: -0.5s;
}
.speech-wave i:nth-child(4) {
  animation-delay: -0.15s;
}
@keyframes speech-wave {
  from {
    transform: scaleY(0.3);
  }
  to {
    transform: scaleY(1);
  }
}
@keyframes speech-loading {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .speech-playback-icon.loading > svg,
  .speech-wave i {
    animation: none;
  }
  .speech-wave i:nth-child(even) {
    height: 6px;
  }
}
</style>
