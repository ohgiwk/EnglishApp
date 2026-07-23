<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Camera, Heart, LockKeyhole, MapPin, GraduationCap } from '@lucide/vue'
import EmmaPortrait from '../components/EmmaPortrait.vue'
import StatBar from '../components/StatBar.vue'
import { chapters, memories } from '../data/chapters'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const tab = computed(() => route.query.tab === 'memories' ? 'memories' : 'profile')
const selectTab = (value: 'profile' | 'memories') => router.replace({ path: '/character', query: { tab: value } })
</script>

<template>
  <section class="profile character-page">
    <header class="character-head">
      <div><p class="eyebrow">CHARACTER</p><h1>{{ store.activeCharacter.name }}</h1></div>
    </header>

    <div class="profile-hero">
      <div class="profile-top"><small>HER PROFILE</small><b>♡ {{ store.relationship }}</b></div>
      <EmmaPortrait expression="smile" :src="store.activeCharacter.image" full/>
      <div class="profile-name">
        <p>{{ store.activeCharacter.englishName }}</p>
        <h1>{{ store.activeCharacter.name }} <span>{{ store.activeCharacter.age }}</span></h1>
      </div>
    </div>

    <div class="character-tabs tabs">
      <button :class="{ active: tab === 'profile' }" @click="selectTab('profile')">Profile</button>
      <button :class="{ active: tab === 'memories' }" @click="selectTab('memories')">Memories</button>
    </div>

    <template v-if="tab === 'profile'">
      <div class="profile-body">
        <div class="card">
          <div class="info"><MapPin/><span><small>FROM</small>{{ store.activeCharacter.origin }}</span></div>
          <div class="info"><GraduationCap/><span><small>MAJOR</small>{{ store.activeCharacter.major }}</span></div>
          <div class="info"><Camera/><span><small>HOBBIES</small>{{ store.activeCharacter.hobbies.join('・') }}</span></div>
        </div>
        <div class="card relationship">
          <div class="section-title"><h3>ふたりの関係</h3><span>{{ store.relationship }}</span></div>
          <StatBar label="Affection - 愛情" :value="store.progress.affection" icon="♥"/>
          <StatBar label="Trust - 信頼" :value="store.progress.trust" icon="✦" color="#8b82dc"/>
        </div>
        <div class="card bio">
          <h3>About {{ store.activeCharacter.englishName.split(' ')[0] }}</h3>
          <p>{{ store.activeCharacter.description }} 距離が縮まると冗談や本音が増えていく。</p>
          <div :class="{ secret: store.progress.completed.length < 2 }">
            <LockKeyhole v-if="store.progress.completed.length < 2"/>
            <span><small>FAVORITE FOOD</small>{{ store.progress.completed.length >= 2 ? 'スパイシーカレー' : 'もっと仲良くなると解放' }}</span>
          </div>
          <div :class="{ secret: store.progress.completed.length < 3 }">
            <LockKeyhole v-if="store.progress.completed.length < 3"/>
            <span><small>HER DREAM</small>{{ store.progress.completed.length >= 3 ? '世界をつなぐ仕事をすること' : '特別な思い出で解放' }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="character-memories">
      <p>{{ store.activeCharacter.name }}と過ごした、大切な瞬間。</p>
      <div class="memory-grid">
        <article v-for="memory in memories" :key="memory.chapterId" :class="{ locked: !store.progress.completed.includes(memory.chapterId) }">
          <template v-if="store.progress.completed.includes(memory.chapterId)">
            <div class="memory-photo">
              <img :src="chapters[memory.chapterId - 1].image" :alt="memory.title">
              <Heart fill="currentColor"/>
            </div>
            <small>MEMORY 0{{ memory.chapterId }}</small>
            <h3>{{ memory.title }}</h3>
            <p>{{ memory.description }}</p>
            <q>{{ memory.expression }}</q>
          </template>
          <template v-else>
            <LockKeyhole/><b>？？？</b><small>Chapter {{ memory.chapterId }}で解放</small>
          </template>
        </article>
      </div>
    </div>
  </section>
</template>
