import { ref } from 'vue'

export const speechPlayback = ref<{
  text: string
  phase: 'loading' | 'playing'
} | null>(null)
