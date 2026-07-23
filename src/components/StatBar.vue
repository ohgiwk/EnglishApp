<script setup lang="ts">
defineProps<{ label: string; value: number; color?: string; icon: string }>()
</script>
<template>
  <div class="stat">
    <div class="stat-head">
      <span>{{ icon }} {{ label }}</span
      ><b>{{ value }}</b>
    </div>
    <div class="track"><i :style="{ width: `${value}%`, background: color || '#f486a5' }" /></div>
  </div>
</template>
