<script setup lang="ts">import { RouterView,useRoute } from 'vue-router'; import BottomNav from './components/BottomNav.vue'; const route=useRoute()</script>
<template><main class="phone"><RouterView v-slot="{Component}"><Transition name="page" mode="out-in"><component :is="Component"/></Transition></RouterView><BottomNav v-if="route.meta.nav"/></main></template>
