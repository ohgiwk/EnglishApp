<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
const router = useRouter(),
  store = useAppStore()
onMounted(() =>
  setTimeout(
    () =>
      router.replace(
        store.s.onboarded
          ? store.s.characterSelectionCompleted
            ? '/home'
            : '/characters'
          : '/onboarding'
      ),
    1800
  )
)
</script>
<template>
  <section class="splash">
    <div class="logo-heart">♡</div>
    <h1>Love<br /><em>Language</em></h1>
    <p>恋する気持ちが、英語になる。</p>
    <div class="loader"><i /></div>
  </section>
</template>
