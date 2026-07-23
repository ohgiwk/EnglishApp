import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildVocabularySession, summarizeVocabularySession } from '../data/vocabulary-engine'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { getCharacter } from '../data/characters'
import type {
  CharacterId,
  CharacterProgress,
  ChoiceResult,
  DailyStudyStats,
  LifetimeStudyStats,
  VocabularyAnswer,
  VocabularyResult,
  VocabularySession,
  WordProgress
} from '../types'

const KEY = 'love-language-save-v1'
const clamp = (value: number) => Math.max(0, Math.min(100, value))
const today = () => new Date().toLocaleDateString('sv-SE')

export interface SaveV4 {
  version: 4
  name: string
  onboarded: boolean
  activeCharacterId: CharacterId
  characterSelectionCompleted: boolean
  characterProgress: Record<CharacterId, CharacterProgress>
  xp: number
  studyDays: number
  lastStudyDate: string
  showTranslation: boolean
  unlockedVocabularyLevel: number
  wordProgress: Record<string, WordProgress>
  activeVocabularySession: VocabularySession | null
  vocabularyResults: VocabularyResult[]
  lastVocabularyResult: VocabularyResult | null
  vocabularyRewardDate: string
  vocabularyRewardCount: number
  lifetimeStudyStats: LifetimeStudyStats
  dailyStudyStats: Record<string, DailyStudyStats>
}

const initialProgress = (affection = 0, trust = 0): CharacterProgress => ({
  affection,
  trust,
  completed: [],
  answers: {},
  reviews: []
})

const emptyLifetimeStats = (): LifetimeStudyStats => ({
  storySessions: 0,
  vocabularySessions: 0,
  questionsAnswered: 0,
  correctAnswers: 0
})

const defaults = (): SaveV4 => ({
  version: 4,
  name: 'Haru',
  onboarded: false,
  activeCharacterId: 'emma',
  characterSelectionCompleted: false,
  characterProgress: {
    emma: initialProgress(18, 12),
    'secret-1': initialProgress(),
    'secret-2': initialProgress()
  },
  xp: 0,
  studyDays: 0,
  lastStudyDate: '',
  showTranslation: true,
  unlockedVocabularyLevel: 1,
  wordProgress: {},
  activeVocabularySession: null,
  vocabularyResults: [],
  lastVocabularyResult: null,
  vocabularyRewardDate: '',
  vocabularyRewardCount: 0,
  lifetimeStudyStats: emptyLifetimeStats(),
  dailyStudyStats: {}
})

const sanitizeProgress = (value: unknown, fallback: CharacterProgress, characterId: CharacterId): CharacterProgress => {
  if (!value || typeof value !== 'object') return fallback
  const source = value as Partial<CharacterProgress>
  const rawAnswers = source.answers && typeof source.answers === 'object' ? source.answers : {}
  const answers = Object.fromEntries(
    Object.entries(rawAnswers).map(([chapterId, result]) => [
      chapterId,
      { ...result, characterId: result.characterId ?? characterId }
    ])
  )
  return {
    affection: clamp(Number(source.affection ?? fallback.affection)),
    trust: clamp(Number(source.trust ?? fallback.trust)),
    completed: Array.isArray(source.completed) ? source.completed : [],
    answers,
    reviews: Array.isArray(source.reviews) ? source.reviews : []
  }
}

const sanitizeDailyStats = (value: unknown): Record<string, DailyStudyStats> => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, Partial<DailyStudyStats>>)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-365)
      .map(([date, stats]) => [date, {
        date,
        xpEarned: Math.max(0, Number(stats.xpEarned ?? 0)),
        storySessions: Math.max(0, Number(stats.storySessions ?? 0)),
        vocabularySessions: Math.max(0, Number(stats.vocabularySessions ?? 0)),
        questionsAnswered: Math.max(0, Number(stats.questionsAnswered ?? 0)),
        correctAnswers: Math.max(0, Number(stats.correctAnswers ?? 0))
      }])
  )
}

export function migrateSave(value: unknown): SaveV4 {
  if (!value || typeof value !== 'object') return defaults()
  const source = value as Partial<SaveV4> & {
    version?: number
    affection?: number
    trust?: number
    completed?: number[]
    answers?: Record<number, ChoiceResult>
    reviews?: string[]
  }
  const base = defaults()
  const hasCharacterProgress = (source.version ?? 0) >= 3 && source.characterProgress
  const legacyEmma: CharacterProgress = {
    affection: clamp(Number(source.affection ?? base.characterProgress.emma.affection)),
    trust: clamp(Number(source.trust ?? base.characterProgress.emma.trust)),
    completed: Array.isArray(source.completed) ? source.completed : [],
    answers: source.answers && typeof source.answers === 'object' ? source.answers : {},
    reviews: Array.isArray(source.reviews) ? source.reviews : []
  }
  const requestedCharacter = getCharacter(source.activeCharacterId)
  const activeCharacterId: CharacterId = requestedCharacter.availability === 'available'
    ? requestedCharacter.id
    : 'emma'
  const characterProgress: Record<CharacterId, CharacterProgress> = {
    emma: sanitizeProgress(hasCharacterProgress ? source.characterProgress?.emma : legacyEmma, base.characterProgress.emma, 'emma'),
    'secret-1': sanitizeProgress(hasCharacterProgress ? source.characterProgress?.['secret-1'] : null, base.characterProgress['secret-1'], 'secret-1'),
    'secret-2': sanitizeProgress(hasCharacterProgress ? source.characterProgress?.['secret-2'] : null, base.characterProgress['secret-2'], 'secret-2')
  }
  const vocabularyResults = Array.isArray(source.vocabularyResults) ? source.vocabularyResults.slice(-30) : []
  const migratedDailyStats: Record<string, DailyStudyStats> = {}
  if (source.version !== 4) {
    for (const result of vocabularyResults) {
      const date = result.completedAt.slice(0, 10)
      const current = migratedDailyStats[date] ?? {
        date, xpEarned: 0, storySessions: 0, vocabularySessions: 0, questionsAnswered: 0, correctAnswers: 0
      }
      current.xpEarned += result.earnedXp
      current.vocabularySessions += 1
      current.questionsAnswered += result.totalCount
      current.correctAnswers += result.correctCount
      migratedDailyStats[date] = current
    }
  }
  const migratedLifetimeStats: LifetimeStudyStats = source.version === 4 && source.lifetimeStudyStats
    ? {
        storySessions: Math.max(0, Number(source.lifetimeStudyStats.storySessions ?? 0)),
        vocabularySessions: Math.max(0, Number(source.lifetimeStudyStats.vocabularySessions ?? 0)),
        questionsAnswered: Math.max(0, Number(source.lifetimeStudyStats.questionsAnswered ?? 0)),
        correctAnswers: Math.max(0, Number(source.lifetimeStudyStats.correctAnswers ?? 0))
      }
    : {
        storySessions: Object.values(characterProgress).reduce((total, item) => total + item.completed.length, 0),
        vocabularySessions: vocabularyResults.length,
        questionsAnswered: vocabularyResults.reduce((total, result) => total + result.totalCount, 0),
        correctAnswers: vocabularyResults.reduce((total, result) => total + result.correctCount, 0)
      }
  return {
    ...base,
    ...source,
    version: 4,
    activeCharacterId,
    characterSelectionCompleted: (source.version ?? 0) >= 3
      ? Boolean(source.characterSelectionCompleted)
      : Boolean(source.onboarded),
    characterProgress,
    unlockedVocabularyLevel: Math.max(1, Math.min(6, Number(source.unlockedVocabularyLevel ?? 1))),
    wordProgress: source.wordProgress && typeof source.wordProgress === 'object' ? source.wordProgress : {},
    vocabularyResults,
    lifetimeStudyStats: migratedLifetimeStats,
    dailyStudyStats: source.version === 4
      ? sanitizeDailyStats(source.dailyStudyStats)
      : sanitizeDailyStats(migratedDailyStats)
  }
}

function load(): SaveV4 {
  try {
    return migrateSave(JSON.parse(localStorage.getItem(KEY) || 'null'))
  } catch {
    return defaults()
  }
}

export const useAppStore = defineStore('app', () => {
  const s = ref<SaveV4>(load())
  const activeCharacter = computed(() => getCharacter(s.value.activeCharacterId))
  const progress = computed(() => s.value.characterProgress[s.value.activeCharacterId])
  const emmaProgress = computed(() => s.value.characterProgress.emma)
  const relationship = computed(() =>
    progress.value.affection >= 75 ? '特別な存在' :
      progress.value.affection >= 45 ? '気になる存在' :
        progress.value.affection >= 25 ? '友達' : '知り合い'
  )
  const currentChapter = computed(() => Math.min(3, Math.max(1, progress.value.completed.length + 1)))
  const learnedCount = computed(() =>
    progress.value.completed.reduce((total, id) => total + [5, 4, 4][id - 1], 0)
  )
  const masteredVocabularyCount = computed(() =>
    Object.values(s.value.wordProgress).filter((progress) => progress.status === 'mastered').length
  )
  const learningVocabularyCount = computed(() =>
    Object.values(s.value.wordProgress).filter((progress) => progress.status === 'learning').length
  )
  const newVocabularyCount = computed(() =>
    vocabularyWords.length - masteredVocabularyCount.value - learningVocabularyCount.value
  )
  const totalCompletedChapters = computed(() =>
    Object.values(s.value.characterProgress).reduce((total, item) => total + item.completed.length, 0)
  )
  const lifetimeAccuracy = computed(() =>
    s.value.lifetimeStudyStats.questionsAnswered
      ? Math.round(s.value.lifetimeStudyStats.correctAnswers / s.value.lifetimeStudyStats.questionsAnswered * 100)
      : 0
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

  function recordStudyActivity(activity: Omit<DailyStudyStats, 'date'>) {
    const date = today()
    const current = s.value.dailyStudyStats[date] ?? {
      date, xpEarned: 0, storySessions: 0, vocabularySessions: 0, questionsAnswered: 0, correctAnswers: 0
    }
    current.xpEarned += activity.xpEarned
    current.storySessions += activity.storySessions
    current.vocabularySessions += activity.vocabularySessions
    current.questionsAnswered += activity.questionsAnswered
    current.correctAnswers += activity.correctAnswers
    s.value.dailyStudyStats[date] = current
    s.value.lifetimeStudyStats.storySessions += activity.storySessions
    s.value.lifetimeStudyStats.vocabularySessions += activity.vocabularySessions
    s.value.lifetimeStudyStats.questionsAnswered += activity.questionsAnswered
    s.value.lifetimeStudyStats.correctAnswers += activity.correctAnswers
    const retained = Object.keys(s.value.dailyStudyStats).sort().slice(-365)
    s.value.dailyStudyStats = Object.fromEntries(retained.map((key) => [key, s.value.dailyStudyStats[key]]))
  }

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

  function complete(result: ChoiceResult) {
    const character = getCharacter(result.characterId)
    if (character.availability !== 'available') return
    const characterProgress = s.value.characterProgress[character.id]
    if (!characterProgress.completed.includes(result.chapterId)) {
      characterProgress.affection = clamp(characterProgress.affection + result.choice.affectionChange)
      characterProgress.trust = clamp(characterProgress.trust + result.choice.trustChange)
      s.value.xp += result.choice.englishXp
      characterProgress.completed.push(result.chapterId)
      recordStudyActivity({
        xpEarned: result.choice.englishXp,
        storySessions: 1,
        vocabularySessions: 0,
        questionsAnswered: 0,
        correctAnswers: 0
      })
      markStudyDay()
    }
    characterProgress.answers[result.chapterId] = result
    persist()
  }

  function toggleReview(id: string) {
    const reviews = progress.value.reviews
    progress.value.reviews = reviews.includes(id)
      ? reviews.filter((reviewId) => reviewId !== id)
      : [...reviews, id]
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
    emmaProgress.value.affection = clamp(emmaProgress.value.affection + result.affectionChange)
    emmaProgress.value.trust = clamp(emmaProgress.value.trust + result.trustChange)
    recordStudyActivity({
      xpEarned: result.earnedXp,
      storySessions: 0,
      vocabularySessions: 1,
      questionsAnswered: result.totalCount,
      correctAnswers: result.correctCount
    })
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
    todayVocabularySessions,
    setName,
    finishOnboarding,
    selectCharacter,
    toggleTranslation,
    complete,
    toggleReview,
    startVocabularySession,
    answerVocabularyQuestion,
    reset
  }
})
