import { buildVocabularySession, summarizeVocabularySession } from '../../data/vocabulary-engine'
import { vocabularyWords } from '../../data/vocabulary'
import {
  isVocabularyMode,
  isVocabularyQuestionCount,
  sanitizeVocabularyStatuses
} from '../../persistence/save'
import { clampRelationship, vocabularyUnlockLevel } from '../../domain/study-rewards'
import { localDateKey } from '../../study-date'
import type {
  VocabularyAnswer,
  VocabularyQuestionCount,
  VocabularyResult,
  VocabularySessionMode,
  VocabularyStatus
} from '../../types'
import type { StudyActionContext } from './context'
const today = () => localDateKey(new Date())

export function createVocabularyActions({
  s,
  emmaProgress,
  persist,
  recordStudyActivity,
  markStudyDay
}: StudyActionContext) {
  function setVocabularyMode(mode: VocabularySessionMode) {
    if (!isVocabularyMode(mode)) return
    s.value.lastSelectedVocabularyMode = mode
    persist()
  }

  function setVocabularyQuestionCount(count: VocabularyQuestionCount) {
    if (!isVocabularyQuestionCount(count)) return
    s.value.lastSelectedVocabularyQuestionCount = count
    persist()
  }

  function setVocabularyStatuses(statuses: VocabularyStatus[]) {
    const selected = sanitizeVocabularyStatuses(statuses)
    s.value.lastSelectedVocabularyStatuses = selected
    persist()
  }

  function startVocabularySession(
    level: number,
    mode: VocabularySessionMode = s.value.lastSelectedVocabularyMode,
    questionCount: number | 'all' = s.value.lastSelectedVocabularyQuestionCount
  ) {
    if (level > s.value.unlockedVocabularyLevel) return
    const levelWordCount = vocabularyWords.filter((word) => word.level === level).length
    const savedQuestionCount: VocabularyQuestionCount =
      questionCount === 'all' || questionCount >= levelWordCount
        ? 'all'
        : isVocabularyQuestionCount(questionCount)
          ? questionCount
          : 'all'
    s.value.lastSelectedVocabularyMode = mode
    s.value.lastSelectedVocabularyQuestionCount = savedQuestionCount
    const session = buildVocabularySession(
      level,
      s.value.wordProgress,
      Math.random,
      `vocab-${Date.now()}`,
      mode,
      savedQuestionCount,
      s.value.lastSelectedVocabularyStatuses
    )
    if (!session.questions.length) {
      s.value.activeVocabularySession = null
      persist()
      return
    }
    s.value.activeVocabularySession = session
    s.value.lastVocabularyResult = null
    persist()
  }

  function cancelVocabularySession() {
    if (!s.value.activeVocabularySession) return
    s.value.activeVocabularySession = null
    persist()
  }

  function finishVocabularySession(): VocabularyResult | null {
    const session = s.value.activeVocabularySession
    if (!session) return null
    if (!session.answers.length) {
      cancelVocabularySession()
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
    emmaProgress.value.affection = clampRelationship(
      emmaProgress.value.affection + result.affectionChange
    )
    emmaProgress.value.trust = clampRelationship(emmaProgress.value.trust + result.trustChange)
    recordStudyActivity({
      xpEarned: result.earnedXp,
      storySessions: 0,
      vocabularySessions: 1,
      vocabularyQuestionsAnswered: result.totalCount,
      questionsAnswered: result.totalCount,
      correctAnswers: result.correctCount
    })
    if (rewardAllowed) s.value.vocabularyRewardCount += 1
    markStudyDay()

    s.value.unlockedVocabularyLevel = vocabularyUnlockLevel(
      s.value.wordProgress,
      s.value.unlockedVocabularyLevel
    )

    s.value.vocabularyResults = [...s.value.vocabularyResults, result].slice(-30)
    s.value.lastVocabularyResult = result
    s.value.activeVocabularySession = null
    persist()
    return result
  }

  function answerVocabularyQuestion(correct: boolean): VocabularyResult | null {
    const session = s.value.activeVocabularySession
    if (!session) return null
    const question = session.questions[session.currentIndex]
    if (!question || session.answers.some((answer) => answer.wordId === question.wordId))
      return null

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

    return finishVocabularySession()
  }

  return {
    setVocabularyMode,
    setVocabularyQuestionCount,
    setVocabularyStatuses,
    startVocabularySession,
    cancelVocabularySession,
    finishVocabularySession,
    answerVocabularyQuestion
  }
}
