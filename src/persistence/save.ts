import { getCharacter } from '../data/characters'
import { getStoryFlow } from '../data/story-flows'
import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import { localDateKey } from '../study-date'
import type {
  ActiveStorySession,
  CharacterId,
  CharacterProgress,
  Choice,
  ChoiceResult,
  StoryChoiceResult,
  DailyStudyStats,
  LifetimeStudyStats,
  VocabularyQuestionCount,
  VocabularyResult,
  VocabularySession,
  VocabularySessionMode,
  VocabularyStatus,
  WordProgress
} from '../types'

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const integer = (value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const number =
    typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback
}
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string'))]
    : []
const timestamp = (value: unknown) =>
  typeof value === 'string' && localDateKey(value) ? value : ''
const validDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const sanitizeChoice = (value: unknown): Choice | null => {
  const source = record(value)
  if (!text(source.id)) return null
  return {
    id: text(source.id),
    englishText: text(source.englishText),
    japaneseText: text(source.japaneseText),
    affectionChange: integer(source.affectionChange, 0, -100, 100),
    trustChange: integer(source.trustChange, 0, -100, 100),
    englishXp: integer(source.englishXp),
    feedback: text(source.feedback),
    naturalExpression: text(source.naturalExpression),
    explanation: text(source.explanation),
    heroineResponse: text(source.heroineResponse),
    heroineResponseJa: text(source.heroineResponseJa),
    heroineExpression: ['normal', 'smile', 'blush', 'confused'].includes(
      text(source.heroineExpression)
    )
      ? (source.heroineExpression as Choice['heroineExpression'])
      : 'normal'
  }
}

const sanitizeStoryChoices = (value: unknown): StoryChoiceResult[] =>
  (Array.isArray(value) ? value : []).flatMap((value) => {
    const source = record(value)
    const cue = record(source.learningCue)
    if (!text(source.pointId) || !text(source.optionId) || !text(cue.id)) return []
    return [
      {
        pointId: text(source.pointId),
        optionId: text(source.optionId),
        englishText: text(source.englishText),
        japaneseText: text(source.japaneseText),
        naturalExpression: text(source.naturalExpression),
        feedback: text(source.feedback),
        affectionChange: integer(source.affectionChange, 0, -100, 100),
        trustChange: integer(source.trustChange, 0, -100, 100),
        englishXp: integer(source.englishXp),
        learningCue: {
          id: text(cue.id),
          title: text(cue.title),
          construction: text(cue.construction),
          explanationEn: text(cue.explanationEn),
          explanationJa: text(cue.explanationJa)
        }
      }
    ]
  })

const sanitizeVocabularyResult = (value: unknown): VocabularyResult | null => {
  const source = record(value)
  if (!text(source.sessionId) || !timestamp(source.completedAt)) return null
  const totalCount = integer(source.totalCount)
  const correctCount = integer(source.correctCount, 0, 0, totalCount)
  return {
    sessionId: text(source.sessionId),
    level: integer(source.level, 1, 1, vocabularyLevels.length),
    mode: isVocabularyMode(source.mode) ? source.mode : 'mixed',
    totalCount,
    correctCount,
    accuracy: totalCount ? Math.round((correctCount / totalCount) * 100) : 0,
    earnedXp: integer(source.earnedXp),
    affectionChange: integer(source.affectionChange, 0, -100, 100),
    trustChange: integer(source.trustChange, 0, -100, 100),
    masteredWordIds: strings(source.masteredWordIds),
    reviewWordIds: strings(source.reviewWordIds),
    completedAt: timestamp(source.completedAt),
    answers: (Array.isArray(source.answers) ? source.answers : []).flatMap((value) => {
      const answer = record(value)
      if (
        !text(answer.wordId) ||
        !isVocabularyMode(answer.type) ||
        answer.type === 'mixed' ||
        typeof answer.correct !== 'boolean' ||
        !timestamp(answer.answeredAt)
      )
        return []
      return [
        {
          wordId: text(answer.wordId),
          type: answer.type,
          correct: answer.correct,
          answeredAt: timestamp(answer.answeredAt)
        }
      ]
    })
  }
}

const sanitizeWordProgress = (value: unknown): Record<string, WordProgress> => {
  const knownWords = new Set(vocabularyWords.map((word) => word.id))
  return Object.fromEntries(
    Object.entries(record(value)).flatMap(([id, value]) => {
      if (!knownWords.has(id) || !value || typeof value !== 'object' || Array.isArray(value))
        return []
      const source = record(value)
      return [
        [
          id,
          {
            status: vocabularyStatuses.includes(source.status as VocabularyStatus)
              ? source.status
              : 'new',
            correctSessions: strings(source.correctSessions),
            correctCount: integer(source.correctCount),
            incorrectCount: integer(source.incorrectCount),
            lastStudiedAt: timestamp(source.lastStudiedAt)
          } as WordProgress
        ]
      ]
    })
  )
}

export interface SaveData {
  version: 6
  name: string
  onboarded: boolean
  activeCharacterId: CharacterId
  characterSelectionCompleted: boolean
  characterProgress: Record<CharacterId, CharacterProgress>
  xp: number
  studyDays: number
  lastStudyDate: string
  showTranslation: boolean
  activeStorySession: ActiveStorySession | null
  unlockedVocabularyLevel: number
  wordProgress: Record<string, WordProgress>
  lastSelectedVocabularyMode: VocabularySessionMode
  lastSelectedVocabularyQuestionCount: VocabularyQuestionCount
  lastSelectedVocabularyStatuses: VocabularyStatus[]
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

export const defaults = (): SaveData => ({
  version: 6,
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
  activeStorySession: null,
  unlockedVocabularyLevel: 1,
  wordProgress: {},
  lastSelectedVocabularyMode: 'mixed',
  lastSelectedVocabularyQuestionCount: 10,
  lastSelectedVocabularyStatuses: ['new', 'learning', 'mastered'],
  activeVocabularySession: null,
  vocabularyResults: [],
  lastVocabularyResult: null,
  vocabularyRewardDate: '',
  vocabularyRewardCount: 0,
  lifetimeStudyStats: emptyLifetimeStats(),
  dailyStudyStats: {}
})

const sanitizeProgress = (
  value: unknown,
  fallback: CharacterProgress,
  characterId: CharacterId
): CharacterProgress => {
  const source = record(value)
  const answers = Object.fromEntries(
    Object.entries(record(source.answers)).flatMap(([id, value]) => {
      const saved = record(value)
      const chapterId = integer(id)
      const choice = sanitizeChoice(saved.choice)
      if (!getStoryFlow(chapterId) || !choice) return []
      const storyChoices = sanitizeStoryChoices(saved.storyChoices)
      const result: ChoiceResult = {
        characterId,
        chapterId,
        choice,
        storyChoices,
        legacy: !storyChoices.length || saved.legacy === true,
        completedAt: timestamp(saved.completedAt) || undefined,
        contentRevision:
          saved.contentRevision === undefined ? undefined : integer(saved.contentRevision),
        totalAffectionChange:
          saved.totalAffectionChange === undefined
            ? undefined
            : integer(saved.totalAffectionChange, 0, -100, 100),
        totalTrustChange:
          saved.totalTrustChange === undefined
            ? undefined
            : integer(saved.totalTrustChange, 0, -100, 100),
        totalEnglishXp:
          saved.totalEnglishXp === undefined ? undefined : integer(saved.totalEnglishXp)
      }
      return [[chapterId, result]]
    })
  )
  return {
    affection: integer(source.affection, fallback.affection, 0, 100),
    trust: integer(source.trust, fallback.trust, 0, 100),
    completed: Array.isArray(source.completed)
      ? [
          ...new Set(
            source.completed.filter(
              (id): id is number => Number.isInteger(id) && Boolean(getStoryFlow(id))
            )
          )
        ]
      : [],
    answers,
    reviews: strings(source.reviews)
  }
}

const sanitizeDailyStats = (value: unknown): Record<string, DailyStudyStats> =>
  Object.fromEntries(
    Object.entries(record(value))
      .filter(
        ([date, stats]) =>
          validDay(date) && stats !== null && typeof stats === 'object' && !Array.isArray(stats)
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-365)
      .map(([date, value]) => {
        const stats = record(value)
        const questionsAnswered = integer(stats.questionsAnswered)
        return [
          date,
          {
            date,
            xpEarned: integer(stats.xpEarned),
            storySessions: integer(stats.storySessions),
            vocabularySessions: integer(stats.vocabularySessions),
            questionsAnswered,
            correctAnswers: integer(stats.correctAnswers, 0, 0, questionsAnswered),
            vocabularyQuestionsAnswered: integer(
              stats.vocabularyQuestionsAnswered,
              0,
              0,
              questionsAnswered
            )
          }
        ]
      })
  )

const vocabularySessionModes: VocabularySessionMode[] = [
  'mixed',
  'en-to-ja',
  'ja-to-en',
  'flashcard',
  'fill-blank',
  'reorder'
]
export const isVocabularyMode = (value: unknown): value is VocabularySessionMode =>
  vocabularySessionModes.includes(value as VocabularySessionMode)
const vocabularyQuestionCounts: VocabularyQuestionCount[] = [10, 20, 50, 'all']
export const isVocabularyQuestionCount = (value: unknown): value is VocabularyQuestionCount =>
  vocabularyQuestionCounts.includes(value as VocabularyQuestionCount)
const vocabularyStatuses: VocabularyStatus[] = ['new', 'learning', 'mastered']
export const sanitizeVocabularyStatuses = (value: unknown): VocabularyStatus[] => {
  if (!Array.isArray(value)) return [...vocabularyStatuses]
  const selected = vocabularyStatuses.filter((status) => value.includes(status))
  return selected.length ? selected : [...vocabularyStatuses]
}

const sanitizeActiveStorySession = (value: unknown): ActiveStorySession | null => {
  const source = record(value) as Partial<ActiveStorySession>
  const flow = getStoryFlow(integer(source.chapterId))
  const character = getCharacter(source.characterId)
  if (
    !flow ||
    source.contentRevision !== flow.revision ||
    typeof source.currentNodeId !== 'string' ||
    !Object.hasOwn(flow.nodes, source.currentNodeId) ||
    character.availability !== 'available'
  ) {
    return null
  }
  const selections = Array.isArray(source.selections)
    ? source.selections.filter((selection) => {
        if (
          !selection ||
          typeof selection !== 'object' ||
          typeof selection.pointId !== 'string' ||
          typeof selection.optionId !== 'string'
        )
          return false
        const node = flow.nodes[selection.pointId]
        return (
          node?.type === 'choice' && node.options.some((option) => option.id === selection.optionId)
        )
      })
    : []
  return {
    characterId: character.id,
    chapterId: flow.chapterId,
    contentRevision: flow.revision,
    currentNodeId: source.currentNodeId,
    history: strings(source.history).filter((nodeId) => Object.hasOwn(flow.nodes, nodeId)),
    selections,
    acknowledgedChoiceIds: strings(source.acknowledgedChoiceIds).filter((id) =>
      Object.hasOwn(flow.nodes, id)
    ),
    reviewOnly: Boolean(source.reviewOnly),
    startedAt: timestamp(source.startedAt) || new Date().toISOString()
  }
}

export function migrateSave(value: unknown): SaveData {
  if (!value || typeof value !== 'object') return defaults()
  const source = record(value) as Omit<Partial<SaveData>, 'version'> & {
    version?: number
    affection?: number
    trust?: number
    completed?: number[]
    answers?: Record<number, ChoiceResult>
    reviews?: string[]
  }
  const base = defaults()
  const version = integer(source.version)
  const hasCharacterProgress = version >= 3 && source.characterProgress
  const legacyEmma: CharacterProgress = {
    affection: integer(source.affection, base.characterProgress.emma.affection, 0, 100),
    trust: integer(source.trust, base.characterProgress.emma.trust, 0, 100),
    completed: Array.isArray(source.completed) ? source.completed : [],
    answers: source.answers && typeof source.answers === 'object' ? source.answers : {},
    reviews: Array.isArray(source.reviews) ? source.reviews : []
  }
  const requestedCharacter = getCharacter(source.activeCharacterId)
  const activeCharacterId: CharacterId =
    requestedCharacter.availability === 'available' ? requestedCharacter.id : 'emma'
  const characterProgress: Record<CharacterId, CharacterProgress> = {
    emma: sanitizeProgress(
      hasCharacterProgress ? source.characterProgress?.emma : legacyEmma,
      base.characterProgress.emma,
      'emma'
    ),
    'secret-1': sanitizeProgress(
      hasCharacterProgress ? source.characterProgress?.['secret-1'] : null,
      base.characterProgress['secret-1'],
      'secret-1'
    ),
    'secret-2': sanitizeProgress(
      hasCharacterProgress ? source.characterProgress?.['secret-2'] : null,
      base.characterProgress['secret-2'],
      'secret-2'
    )
  }
  const vocabularyResults = Array.isArray(source.vocabularyResults)
    ? source.vocabularyResults
        .map(sanitizeVocabularyResult)
        .filter((result): result is VocabularyResult => result !== null)
        .slice(-30)
    : []
  const migratedDailyStats: Record<string, DailyStudyStats> = {}
  if (version < 4) {
    for (const result of vocabularyResults) {
      const date = localDateKey(result.completedAt)
      const current = migratedDailyStats[date] ?? {
        date,
        vocabularyQuestionsAnswered: 0,
        xpEarned: 0,
        storySessions: 0,
        vocabularySessions: 0,
        questionsAnswered: 0,
        correctAnswers: 0
      }
      current.vocabularyQuestionsAnswered += result.totalCount
      current.xpEarned += result.earnedXp
      current.vocabularySessions += 1
      current.questionsAnswered += result.totalCount
      current.correctAnswers += result.correctCount
      migratedDailyStats[date] = current
    }
  }
  const migratedLifetimeStats: LifetimeStudyStats =
    version >= 4 && source.lifetimeStudyStats
      ? {
          storySessions: integer(source.lifetimeStudyStats.storySessions),
          vocabularySessions: integer(source.lifetimeStudyStats.vocabularySessions),
          questionsAnswered: integer(source.lifetimeStudyStats.questionsAnswered),
          correctAnswers: integer(
            source.lifetimeStudyStats.correctAnswers,
            0,
            0,
            integer(source.lifetimeStudyStats.questionsAnswered)
          )
        }
      : {
          storySessions: Object.values(characterProgress).reduce(
            (total, item) => total + item.completed.length,
            0
          ),
          vocabularySessions: vocabularyResults.length,
          questionsAnswered: vocabularyResults.reduce(
            (total, result) => total + result.totalCount,
            0
          ),
          correctAnswers: vocabularyResults.reduce(
            (total, result) => total + result.correctCount,
            0
          )
        }
  const dailyStudyStats = sanitizeDailyStats(
    version >= 4 ? source.dailyStudyStats : migratedDailyStats
  )
  if (version >= 4 && version < 6) {
    const retainedCounts: Record<string, number> = {}
    const datedStories: Record<string, { sessions: number; questions: number }> = {}
    for (const progress of Object.values(characterProgress)) {
      for (const result of Object.values(progress.answers)) {
        if (!result.completedAt) continue
        const day = localDateKey(result.completedAt)
        const current = datedStories[day] ?? { sessions: 0, questions: 0 }
        current.sessions += 1
        current.questions += result.storyChoices?.length ?? 0
        datedStories[day] = current
      }
    }
    for (const result of vocabularyResults) {
      const day = localDateKey(result.completedAt)
      retainedCounts[day] = (retainedCounts[day] ?? 0) + result.totalCount
    }
    for (const [day, stats] of Object.entries(dailyStudyStats)) {
      // Old mixed days cannot be reconstructed exactly once result history has been pruned.
      stats.vocabularyQuestionsAnswered =
        stats.storySessions === 0
          ? stats.questionsAnswered
          : datedStories[day]?.sessions === stats.storySessions
            ? Math.max(0, stats.questionsAnswered - datedStories[day].questions)
            : Math.min(stats.questionsAnswered, retainedCounts[day] ?? 0)
    }
  }
  return {
    ...base,
    name: text(source.name, base.name),
    xp: integer(source.xp),
    studyDays: integer(source.studyDays),
    lastStudyDate: validDay(source.lastStudyDate) ? source.lastStudyDate : '',
    showTranslation:
      typeof source.showTranslation === 'boolean' ? source.showTranslation : base.showTranslation,
    vocabularyRewardDate: validDay(source.vocabularyRewardDate) ? source.vocabularyRewardDate : '',
    vocabularyRewardCount: integer(source.vocabularyRewardCount, 0, 0, 3),
    lastVocabularyResult: sanitizeVocabularyResult(source.lastVocabularyResult),
    version: 6,
    activeCharacterId,
    onboarded: Boolean(source.onboarded || source.characterSelectionCompleted),
    characterSelectionCompleted:
      version >= 3 ? Boolean(source.characterSelectionCompleted) : Boolean(source.onboarded),
    characterProgress,
    unlockedVocabularyLevel: integer(source.unlockedVocabularyLevel, 1, 1, vocabularyLevels.length),
    wordProgress: sanitizeWordProgress(source.wordProgress),
    lastSelectedVocabularyMode: isVocabularyMode(source.lastSelectedVocabularyMode)
      ? source.lastSelectedVocabularyMode
      : 'mixed',
    lastSelectedVocabularyQuestionCount: isVocabularyQuestionCount(
      source.lastSelectedVocabularyQuestionCount
    )
      ? source.lastSelectedVocabularyQuestionCount
      : 10,
    lastSelectedVocabularyStatuses: sanitizeVocabularyStatuses(
      source.lastSelectedVocabularyStatuses
    ),
    activeStorySession: sanitizeActiveStorySession(source.activeStorySession),
    activeVocabularySession: null,
    vocabularyResults,
    lifetimeStudyStats: migratedLifetimeStats,
    dailyStudyStats
  }
}
