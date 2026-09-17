import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '../stores/app'

const view = (name: string) => () => import(`../views/${name}.vue`)
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0, left: 0 }),
  routes: [
    { path: '/', component: view('SplashView') },
    { path: '/onboarding', component: view('OnboardingView') },
    { path: '/name', component: view('NameView') },
    { path: '/characters', component: view('CharacterSelectView') },
    { path: '/home', component: view('HomeView'), meta: { nav: true } },
    { path: '/story', component: view('StoryView'), meta: { nav: true } },
    { path: '/conversation/:id', component: view('ConversationView') },
    { path: '/choice/:id', redirect: (to) => `/conversation/${to.params.id}` },
    { path: '/result/:id', component: view('ResultView') },
    { path: '/learn', component: view('LearnView'), meta: { nav: true } },
    { path: '/learn/session/:level', component: view('VocabularySessionView') },
    { path: '/learn/result', component: view('VocabularyResultView') },
    { path: '/learn/words', component: view('WordBookView'), meta: { nav: true } },
    { path: '/learn/review', component: view('ReviewView'), meta: { nav: true } },
    { path: '/review', redirect: '/learn/review' },
    { path: '/character', component: view('CharacterView'), meta: { nav: true } },
    { path: '/status', component: view('StatusView'), meta: { nav: true } },
    { path: '/settings', component: view('SettingsView') },
    { path: '/profile', redirect: { path: '/character', query: { tab: 'profile' } } },
    { path: '/memories', redirect: { path: '/character', query: { tab: 'memories' } } }
  ]
})

router.beforeEach((to) => {
  const store = useAppStore()
  if (to.path === '/') return true
  if (to.path === '/onboarding') {
    if (!store.s.onboarded) return true
    return store.s.characterSelectionCompleted ? '/home' : '/characters'
  }
  if (['/name', '/characters'].includes(to.path)) return true
  if (!store.s.onboarded) return '/onboarding'
  if (!store.s.characterSelectionCompleted) return '/characters'
  return true
})

export default router
