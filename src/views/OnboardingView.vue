<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessageCircleHeart, MessagesSquare, BookHeart, ArrowRight } from '@lucide/vue'
const router = useRouter(),
  page = ref(0)
const slides = [
  {
    icon: MessageCircleHeart,
    title: '英語で始まる、\n新しい出会い',
    text: '国際シェアハウスで出会ったエマ。\nふたりの物語は、ひとことの英語から。'
  },
  {
    icon: MessagesSquare,
    title: '選んだ言葉で、\n関係が変わる',
    text: '正しさだけが答えじゃない。\nあなたらしい言葉が、彼女の心を動かします。'
  },
  {
    icon: BookHeart,
    title: '間違えても、\n大丈夫',
    text: '会話のあとは優しく振り返り。\n自然な表現を少しずつ身につけよう。'
  }
]
function next() {
  if (page.value < 2) {
    page.value++
  } else {
    router.push('/name')
  }
}
</script>
<template>
  <section class="onboarding">
    <button class="skip" @click="router.push('/name')">スキップ</button>
    <Transition name="onboard-slide" mode="out-in">
      <div :key="`art-${page}`" class="onboard-art">
        <component :is="slides[page].icon" :size="68" />
        <div class="orbit">✦</div>
      </div>
    </Transition>
    <div class="onboard-actions">
      <Transition name="onboard-slide" mode="out-in">
        <div :key="`copy-${page}`" class="onboard-copy">
          <p class="eyebrow">STORY {{ page + 1 }} / 3</p>
          <h1 class="preline">{{ slides[page].title }}</h1>
          <p class="muted preline">{{ slides[page].text }}</p>
        </div>
      </Transition>
      <div class="dots"><i v-for="n in 3" :class="{ active: n - 1 === page }" /></div>
      <button class="primary" @click="next">
        {{ page === 2 ? '物語を始める' : '次へ' }} <ArrowRight :size="20" />
      </button>
    </div>
  </section>
</template>
