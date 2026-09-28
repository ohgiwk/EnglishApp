import type { Ref } from 'vue'
import type { PromotionExamResult, PromotionExamSession } from '../../types'
import type { StudyActionContext } from './context'
import {
  buildPromotionExam,
  EXAM_SIZE,
  EXAM_PASS_COUNT,
  examAnswer,
  grantExamEligibility,
  lastVocabularyLevel
} from '../../domain/promotion-exam'

export function createPromotionExamActions(
  { s, persist }: StudyActionContext,
  activeExam: Ref<PromotionExamSession | null>
) {
  function canTakeExam(level: number) {
    return (
      level === s.value.unlockedVocabularyLevel &&
      level < lastVocabularyLevel &&
      s.value.eligibleExamLevels.includes(level)
    )
  }
  function startPromotionExam(level: number) {
    if (!canTakeExam(level) || activeExam.value) return false
    activeExam.value = buildPromotionExam(level)
    return true
  }
  function answerPromotionExam(
    sessionId: string,
    index: number,
    selected: string
  ): PromotionExamResult | null {
    const session = activeExam.value
    if (
      !session ||
      session.id !== sessionId ||
      index !== session.answers.length ||
      !canTakeExam(session.level)
    )
      return null
    const question = session.questions[index]
    if (!question || !question.options.includes(selected)) return null
    session.answers.push({
      wordId: question.wordId,
      type: question.type,
      selected,
      correct: selected === examAnswer(question)
    })
    if (session.answers.length !== EXAM_SIZE) return null
    const correctCount = session.answers.filter((answer) => answer.correct).length
    const result: PromotionExamResult = {
      id: session.id,
      level: session.level,
      answers: [...session.answers],
      correctCount,
      passed: correctCount >= EXAM_PASS_COUNT,
      completedAt: new Date().toISOString()
    }
    if (result.passed) {
      s.value.passedExamLevels.push(session.level)
      s.value.unlockedVocabularyLevel = session.level + 1
      result.unlockedExamLevel = grantExamEligibility(s.value)
    }
    s.value.examResults = [...s.value.examResults, result].slice(-30)
    activeExam.value = null
    persist()
    return result
  }
  function cancelPromotionExam() {
    activeExam.value = null
  }
  function acknowledgeExamNotification(level: number) {
    if (!s.value.notifiedExamLevels.includes(level)) s.value.notifiedExamLevels.push(level)
    persist()
  }
  function acknowledgeExamMigration() {
    s.value.examMigrationNotice = false
    persist()
  }
  return {
    canTakeExam,
    startPromotionExam,
    answerPromotionExam,
    cancelPromotionExam,
    acknowledgeExamNotification,
    acknowledgeExamMigration
  }
}
