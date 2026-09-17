<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { useAppStore } from './stores/app'
import { applyPwaUpdate, dismissPwaUpdate, pwaUpdate } from './pwa-update'
const route = useRoute()
const store = useAppStore()
</script>
<template>
  <main class="phone">
    <p v-if="store.saveError" class="save-error" role="alert">{{ store.saveError }}</p>
    <RouterView v-slot="{ Component }"
      ><Transition name="page" mode="out-in"><component :is="Component" /></Transition></RouterView
    ><BottomNav v-if="route.meta.nav" />
    <Transition name="update-notice">
      <aside v-if="pwaUpdate.available" class="update-notice" role="status" aria-live="polite">
        <button
          class="update-notice-close"
          type="button"
          aria-label="あとで更新する"
          @click="dismissPwaUpdate"
        >
          ×
        </button>
        <div>
          <strong>新しいバージョンがあります</strong>
          <span>更新すると、最新の機能をすぐに利用できます。</span>
        </div>
        <button
          class="update-notice-action"
          type="button"
          :disabled="pwaUpdate.applying"
          @click="applyPwaUpdate"
        >
          {{ pwaUpdate.applying ? '更新中…' : '今すぐ更新' }}
        </button>
      </aside>
    </Transition>
  </main>
</template>

<style scoped>
.save-error {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  width: min(90%, 390px);
  padding: 12px 16px;
  border: 1px solid #e49aaa;
  border-radius: 12px;
  background: #fff0f3;
  color: #813b4a;
  font-size: 13px;
}

.update-notice {
  position: fixed;
  z-index: 1000;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(18px, calc(env(safe-area-inset-bottom) + 12px));
  left: max(16px, env(safe-area-inset-left));
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 14px;
  align-items: center;
  max-width: 398px;
  margin: 0 auto;
  padding: 17px 18px;
  color: #443346;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(239 117 153 / 28%);
  border-radius: 20px;
  box-shadow: 0 16px 44px rgb(73 44 63 / 22%);
  backdrop-filter: blur(18px);
}
.update-notice div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.update-notice strong {
  font-size: 13px;
  line-height: 1.4;
}
.update-notice span {
  color: #897987;
  font-size: 10px;
  line-height: 1.5;
}
.update-notice-action {
  min-height: 40px;
  padding: 0 14px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  background: linear-gradient(135deg, #ef7599, #dc5f87);
  border: 0;
  border-radius: 13px;
  box-shadow: 0 7px 18px rgb(239 117 153 / 28%);
}
.update-notice-action:disabled {
  opacity: 0.65;
}
.update-notice-close {
  position: absolute;
  top: -8px;
  right: -7px;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  padding: 0;
  color: #8e7b88;
  font-size: 16px;
  line-height: 1;
  background: #fff;
  border: 1px solid #eee4e9;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgb(73 44 63 / 14%);
}
.update-notice-enter-active,
.update-notice-leave-active {
  transition: 0.24s ease;
}
.update-notice-enter-from,
.update-notice-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
@media (min-width: 600px) {
  .update-notice {
    left: 50%;
    width: calc(100% - 32px);
    transform: translateX(-50%);
  }
  .update-notice-enter-from,
  .update-notice-leave-to {
    transform: translate(-50%, 16px) scale(0.98);
  }
}
</style>
