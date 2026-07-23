import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildVocabularySession, summarizeVocabularySession } from '../data/vocabulary-engine'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import type {
  ChoiceResult,
  VocabularyAnswer,
  VocabularyResult,
  VocabularySession,
  WordProgress
} from '../types'

const KEY = 'love-language-save-v1'
const clamp = (value: number) => Math.max(0, Math.min(100, value))
const today = () => new Date().toLocaleDateString('sv-SE')

export interface SaveV2 {
  version: 2
  name: string
  onboarded: boolean
  affection: number
  trust: number
  xp: number
  studyDays: number
  lastStudyDate: string
  completed: number[]
  answers: Record<number, ChoiceResult>
  reviews: string[]
  showTranslation: boolean
  unlockedVocabularyLevel: number
  wordProgress: Record<string, WordProgress>
  activeVocabularySession: VocabularySession | null
  vocabularyResults: VocabularyResult[]
  lastVocabularyResult: VocabularyResult | null
  vocabularyRewardDate: string
  vocabularyRewardCount: number
}

const defaults = (): SaveV2 => ({
  version: 2,
  name: 'Haru',
  onboarded: false,
  affection: 18,
  trust: 12,
  xp: 0,
  studyDays: 0,
  lastStudyDate: '',
  completed: [],
  answers: {},
  reviews: [],
  showTranslation: true,
  unlockedVocabularyLevel: 1,
  wordProgress: {},
  activeVocabularySession: null,
  vocabularyResults: [],
  lastVocabularyResult: null,
  vocabularyRewardDate: '',
  vocabularyRewardCount: 0
})

export function migrateSave(value: unknown): SaveV2 {
  if (!value || typeof value !== 'object') return defaults()
  const source = value as Partial<SaveV2> & { version?: number }
  const base = defaults()
  return {
    ...base,
    ...source,
    version: 2,
    affection: clamp(Number(source.affection ?? base.affection)),
    trust: clamp(Number(source.trust ?? base.trust)),
    completed: Array.isArray(source.completed) ? source.completed : [],
    reviews: Array.isArray(source.reviews) ? source.reviews : [],
    answers: source.answers && typeof source.answers === 'object' ? source.answers : {},
    unlockedVocabularyLevel: Math.max(1, Math.min(6, Number(source.unlockedVocabularyLevel ?? 1))),
    wordProgress: source.wordProgress && typeof source.wordProgress === 'object' ? source.wordProgress : {},
    vocabularyResults: Array.isArray(source.vocabularyResults) ? source.vocabularyResults.slice(-30) : []
  }
}

function load(): SaveV2 {
  try {
    return migrateSave(JSON.parse(localStorage.getItem(KEY) || 'null'))
  } catch {
    return defaults()
  }
}

export const useAppStore = defineStore('app', () => {
  const s = ref<SaveV2>(load())
  const relationship = computed(() =>
    s.value.affection >= 75 ? '特別な存在' :
      s.value.affection >= 45 ? '気になる存在' :
        s.value.affection >= 25 ? '友達' : '知り合い'
  )
  const currentChapter = computed(() => Math.min(3, Math.max(1, s.value.completed.length + 1)))
  const learnedCount = computed(() =>
    s.value.completed.reduce((total, id) => total + [5, 4, 4][id - 1], 0)
  )
  const masteredVocabularyCount = computed(() =>
    Object.values(s.value.wordProgress).filter((progress) => progress.status === 'mastered').length
  )
  const todayVocabularySessions = computed(() =>
    s.value.vocabularyResults.filter((result) => result.completedAt.slice(0, 10) === today()).length
  )

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(s.value))
  }

  function markStudyDay() {
    if (s.value.lastStudyDate !== today()) {
      s.value.studyDays += 1
      s.value.lastStudyDate = today()
    }
  }

  function setName(name: string) {
    s.value.name = name.trim()
    persist()
  }

  function finishOnboarding() {
    s.value.onboarded = true
    persist()
  }

  function toggleTranslation() {
    s.value.showTranslation = !s.value.showTranslation
    persist()
  }

  function complete(result: ChoiceResult) {
    if (!s.value.completed.includes(result.chapterId)) {
      s.value.affection = clamp(s.value.affection + result.choice.affectionChange)
      s.value.trust = clamp(s.value.trust + result.choice.trustChange)
      s.value.xp += result.choice.englishXp
      s.value.completed.push(result.chapterId)
      markStudyDay()
    }
    s.value.answers[result.chapterId] = result
    persist()
  }

  function toggleReview(id: string) {
    s.value.reviews = s.value.reviews.includes(id)
      ? s.value.reviews.filter((reviewId) => reviewId !== id)
      : [...s.value.reviews, id]
    persist()
  }

  function startVocabularySession(level: number) {
    if (level > s.value.unlockedVocabularyLevel) return
    s.value.activeVocabularySession = buildVocabularySession(level, s.value.wordProgress)
    s.value.lastVocabularyResult = null
    persist()
  }

  function answerVocabularyQuestion(correct: boolean): VocabularyResult | null {
    const session = s.value.activeVocabularySession
    if (!session) return null
    const question = session.questions[session.currentIndex]
    if (!question || session.answers.some((answer) => answer.wordId === question.wordId)) return null

    const answer: VocabularyAnswer = {
      wordId: question.wordId,
      type: question.type,
      correct,
      answeredAt: new Date().toISOString()
    }
    session.answers.push(answer)

    const previous = s.value.wordProgress[question.wordId]
    const correctSessions = correct
      ? [...new Set([...(previous?.correctSessions ?? []), session.id])]
      : []
    s.value.wordProgress[question.wordId] = {
      status: correctSessions.length >= 2 ? 'mastered' : 'learning',
      correctSessions,
      correctCount: (previous?.correctCount ?? 0) + (correct ? 1 : 0),
      incorrectCount: (previous?.incorrectCount ?? 0) + (correct ? 0 : 1),
      lastStudiedAt: answer.answeredAt
    }

    session.currentIndex += 1
    if (session.currentIndex < session.questions.length) {
      persist()
      return null
    }

    const masteredWordIds = session.answers
      .filter((item) => s.value.wordProgress[item.wordId]?.status === 'mastered')
      .map((item) => item.wordId)

    if (s.value.vocabularyRewardDate !== today()) {
      s.value.vocabularyRewardDate = today()
      s.value.vocabularyRewardCount = 0
    }
    const rewardAllowed = s.value.vocabularyRewardCount < 3
    const result = summarizeVocabularySession(session, masteredWordIds, rewardAllowed)
    s.value.xp += result.earnedXp
    s.value.affection = clamp(s.value.affection + result.affectionChange)
    s.value.trust = clamp(s.value.trust + result.trustChange)
    if (rewardAllowed) s.value.vocabularyRewardCount += 1
    markStudyDay()

    for (let level = 1; level < vocabularyLevels.length; level += 1) {
      const levelWords = vocabularyWords.filter((word) => word.level === level)
      const mastered = levelWords.filter((word) => s.value.wordProgress[word.id]?.status === 'mastered').length
      if (mastered / levelWords.length >= 0.7) {
        s.value.unlockedVocabularyLevel = Math.max(s.value.unlockedVocabularyLevel, level + 1)
      }
    }

    s.value.vocabularyResults = [...s.value.vocabularyResults, result].slice(-30)
    s.value.lastVocabularyResult = result
    s.value.activeVocabularySession = null
    persist()
    return result
  }

  function reset() {
    s.value = defaults()
    persist()
  }

  return {
    s,
    relationship,
    currentChapter,
    learnedCount,
    masteredVocabularyCount,
    todayVocabularySessions,
    setName,
    finishOnboarding,
    toggleTranslation,
    complete,
    toggleReview,
    startVocabularySession,
    answerVocabularyQuestion,
    reset
  }
})
