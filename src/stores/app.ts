import { computed, ref } from 'vue'
import { createPromotionExamActions } from './actions/promotion-exam'
import type { PromotionExamSession } from '../types'
import { defineStore } from 'pinia'
import { vocabularyWords } from '../data/vocabulary'
import { chapters } from '../data/chapters'
import { getCharacter } from '../data/characters'
import type { CharacterId, DailyStudyStats } from '../types'
import { defaults, type SaveData } from '../persistence/save'
import { createStoryActions } from './actions/story'
import { createVocabularyActions } from './actions/vocabulary'
import { createLegacyStoryActions } from './actions/legacy-story'
import { recordStudyActivity } from '../domain/study-statistics'
import { loadSave, writeSave } from '../persistence/storage'
import { localDateKey } from '../study-date'
export { migrateSave } from '../persistence/save'

const today = () => localDateKey(new Date())

export const useAppStore = defineStore('app', () => {
  const loaded = loadSave()
  const s = ref<SaveData>(loaded.save)
  const activeExam = ref<PromotionExamSession | null>(null)
  const saveError = ref(loaded.error)
  const activeCharacter = computed(() => getCharacter(s.value.activeCharacterId))
  const progress = computed(() => s.value.characterProgress[s.value.activeCharacterId])
  const emmaProgress = computed(() => s.value.characterProgress.emma)
  const relationship = computed(() =>
    progress.value.affection >= 75
      ? '特別な存在'
      : progress.value.affection >= 45
        ? '気になる存在'
        : progress.value.affection >= 25
          ? '友達'
          : '知り合い'
  )
  const currentChapter = computed(
    () => chapters[Math.min(progress.value.completed.length, chapters.length - 1)]?.id ?? 1
  )
  const learnedCount = computed(() =>
    progress.value.completed.reduce(
      (total, id) =>
        total + (chapters.find((chapter) => chapter.id === id)?.expressions.length ?? 0),
      0
    )
  )
  const masteredVocabularyCount = computed(
    () =>
      Object.values(s.value.wordProgress).filter((progress) => progress.status === 'mastered')
        .length
  )
  const learningVocabularyCount = computed(
    () =>
      Object.values(s.value.wordProgress).filter((progress) => progress.status === 'learning')
        .length
  )
  const newVocabularyCount = computed(
    () => vocabularyWords.length - masteredVocabularyCount.value - learningVocabularyCount.value
  )
  const totalCompletedChapters = computed(() =>
    Object.values(s.value.characterProgress).reduce(
      (total, item) => total + item.completed.length,
      0
    )
  )
  const lifetimeAccuracy = computed(() =>
    s.value.lifetimeStudyStats.questionsAnswered
      ? Math.round(
          (s.value.lifetimeStudyStats.correctAnswers /
            s.value.lifetimeStudyStats.questionsAnswered) *
            100
        )
      : 0
  )
  const todayVocabularyWordCount = computed(
    () => s.value.dailyStudyStats[today()]?.vocabularyQuestionsAnswered ?? 0
  )

  function persist() {
    // A failed initial read must never allow defaults to overwrite an existing save.
    if (loaded.error) return
    saveError.value = writeSave(s.value)
  }

  function markStudyDay() {
    const date = today()
    if (s.value.lastStudyDate !== date) {
      s.value.studyDays += 1
      s.value.lastStudyDate = date
    }
  }
  const actionContext = {
    s,
    progress,
    emmaProgress,
    persist,
    markStudyDay,
    recordStudyActivity: (activity: Omit<DailyStudyStats, 'date'>) =>
      recordStudyActivity(s.value, activity, today())
  }
  const examActions = createPromotionExamActions(actionContext, activeExam)
  const storyActions = createStoryActions(actionContext)
  const vocabularyActions = createVocabularyActions(actionContext)
  const legacyActions = createLegacyStoryActions(actionContext)

  function setName(name: string) {
    s.value.name = name.trim()
    persist()
  }

  function finishOnboarding() {
    s.value.onboarded = true
    persist()
  }

  function selectCharacter(id: CharacterId) {
    const character = getCharacter(id)
    if (character.availability !== 'available') return false
    s.value.activeCharacterId = character.id
    s.value.characterSelectionCompleted = true
    s.value.onboarded = true
    persist()
    return true
  }

  function toggleTranslation() {
    s.value.showTranslation = !s.value.showTranslation
    persist()
  }

  function toggleReview(id: string) {
    const reviews = progress.value.reviews
    progress.value.reviews = reviews.includes(id)
      ? reviews.filter((reviewId) => reviewId !== id)
      : [...reviews, id]
    persist()
  }

  function reset() {
    activeExam.value = null
    s.value = defaults()
    loaded.error = null
    persist()
  }

  return {
    s,
    saveError,
    activeCharacter,
    progress,
    emmaProgress,
    relationship,
    currentChapter,
    learnedCount,
    masteredVocabularyCount,
    learningVocabularyCount,
    newVocabularyCount,
    totalCompletedChapters,
    lifetimeAccuracy,
    todayVocabularyWordCount,
    setName,
    finishOnboarding,
    selectCharacter,
    toggleTranslation,
    activeExam,
    ...examActions,
    ...storyActions,
    ...vocabularyActions,
    ...legacyActions,
    toggleReview,
    reset
  }
})
