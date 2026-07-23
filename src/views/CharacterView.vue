<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Camera, Heart, MapPin } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import StatBar from '../components/StatBar.vue'
import { chapters, memories } from '../data/chapters'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const tab = computed(() => (route.query.tab === 'memories' ? 'memories' : 'profile'))
const selectTab = (value: 'profile' | 'memories') =>
  router.replace({ path: '/character', query: { tab: value } })
</script>

<template>
  <section class="profile character-page">
    <header class="character-head">
      <div>
        <p class="eyebrow">CHARACTER</p>
      </div>
    </header>

    <div class="profile-hero">
      <div class="profile-top">
        <b>♡ {{ store.relationship }}</b>
      </div>
      <EmmaPortrait expression="smile" :src="store.activeCharacter.image" full />
      <div class="profile-name">
        <p>{{ store.activeCharacter.englishName }}</p>
        <h1>
          {{ store.activeCharacter.name }} <span>Age: {{ store.activeCharacter.age }}</span>
        </h1>
      </div>
    </div>

    <div class="character-tabs tabs">
      <button :class="{ active: tab === 'profile' }" @click="selectTab('profile')">Profile</button>
      <button :class="{ active: tab === 'memories' }" @click="selectTab('memories')">
        Memories
      </button>
    </div>

    <template v-if="tab === 'profile'">
      <div class="profile-body">
        <div class="card">
          <div class="info">
            <MapPin /><span><small>FROM</small>{{ store.activeCharacter.origin }}</span>
          </div>
          <div class="info">
            <Camera /><span
              ><small>HOBBIES</small>{{ store.activeCharacter.hobbies.join('・') }}</span
            >
          </div>
        </div>
        <div class="card relationship">
          <div class="section-title">
            <h3>ふたりの関係</h3>
            <span>{{ store.relationship }}</span>
          </div>
          <StatBar label="Affection - 愛情" :value="store.progress.affection" icon="♥" />
          <StatBar label="Trust - 信頼" :value="store.progress.trust" icon="✦" color="#8b82dc" />
        </div>
        <div class="card bio">
          <h3>About {{ store.activeCharacter.englishName.split(' ')[0] }}</h3>
          <p>{{ store.activeCharacter.description }}</p>
        </div>
      </div>
    </template>

    <div v-else class="character-memories">
      <p>{{ store.activeCharacter.name }}と過ごした、大切な瞬間。</p>
      <div class="memory-grid">
        <article
          v-for="memory in memories"
          :key="memory.chapterId"
          :class="{ locked: !store.progress.completed.includes(memory.chapterId) }"
        >
          <template v-if="store.progress.completed.includes(memory.chapterId)">
            <div class="memory-photo">
              <img :src="chapters[memory.chapterId - 1].image" :alt="memory.title" />
              <Heart fill="currentColor" />
            </div>
            <small>MEMORY 0{{ memory.chapterId }}</small>
            <h3>{{ memory.title }}</h3>
            <p>{{ memory.description }}</p>
            <q>{{ memory.expression }}</q>
          </template>
          <template v-else>
            <LockKeyhole /><b>？？？</b><small>Chapter {{ memory.chapterId }}で解放</small>
          </template>
        </article>
      </div>
    </div>
  </section>
</template>
