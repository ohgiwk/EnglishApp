<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, ChevronRight, Heart, LockKeyhole } from '@lucide/vue'
import { characters } from '../data/characters'
import { useAppStore } from '../stores/app'
import type { CharacterDefinition } from '../types'

const store = useAppStore()
const router = useRouter()
const notice = ref('')

function choose(character: CharacterDefinition) {
  if (character.availability === 'secret') {
    notice.value = 'このキャラクターはまだ公開されていません'
    window.setTimeout(() => {
      notice.value = ''
    }, 2400)
    return
  }
  if (store.selectCharacter(character.id)) router.push('/home')
}
</script>

<template>
  <section class="page character-select">
    <header class="page-head">
      <p class="eyebrow">CHOOSE YOUR STORY</p>
      <h1>誰との物語を始める？</h1>
      <p>選んだ相手との会話や関係は、それぞれ大切に記録されます。</p>
    </header>

    <div class="character-list">
      <button
        v-for="character in characters"
        :key="character.id"
        class="character-option"
        :class="{
          secret: character.availability === 'secret',
          selected: store.s.activeCharacterId === character.id
        }"
        :style="{ '--character-accent': character.accent }"
        @click="choose(character)"
      >
        <template v-if="character.availability === 'available'">
          <div class="character-image"><img :src="character.image" :alt="character.name" /></div>
          <div class="character-copy">
            <small>AVAILABLE CHARACTER</small>
            <h2>{{ character.name }}</h2>
            <b>{{ character.englishName }}</b>
            <p>{{ character.origin }}</p>
            <p>{{ character.description }}</p>
            <span><Heart :size="15" fill="currentColor" /> {{ store.relationship }}</span>
            <strong>この物語を始める <ChevronRight :size="17" /></strong>
          </div>
          <i v-if="store.s.characterSelectionCompleted" class="selected-mark"
            ><Check :size="15"
          /></i>
        </template>
        <template v-else>
          <div class="secret-silhouette"><span>?</span></div>
          <div class="character-copy">
            <small>SECRET CHARACTER</small>
            <h2>？？？</h2>
            <b>Coming Soon</b>
            <p>新しい出会いは、まだ秘密。</p>
            <span class="locked-label"><LockKeyhole :size="15" /> 未公開</span>
          </div>
        </template>
      </button>
    </div>

    <Transition name="notice">
      <div v-if="notice" class="character-notice"><LockKeyhole :size="17" />{{ notice }}</div>
    </Transition>
  </section>
</template>
