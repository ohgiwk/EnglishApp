import { getStoryFlow } from '../../data/story-flows'
import { legacyChoiceFromStoryResult, storyChoiceResults } from '../../data/story-engine'
import { storySelectionsForReview } from './legacy-story'
import { clampRelationship, storyRewards } from '../../domain/study-rewards'
import type { ChoiceResult } from '../../types'
import type { StudyActionContext } from './context'

export function createStoryActions({
  s,
  progress,
  persist,
  recordStudyActivity,
  markStudyDay
}: StudyActionContext) {
  function startStorySession(chapterId: number) {
    const flow = getStoryFlow(chapterId)
    if (!flow) return false
    const existing = progress.value.answers[chapterId]
    const active = s.value.activeStorySession
    if (
      active?.characterId === s.value.activeCharacterId &&
      active.chapterId === chapterId &&
      active.contentRevision === flow.revision
    ) {
      return true
    }
    s.value.activeStorySession = {
      characterId: s.value.activeCharacterId,
      chapterId,
      contentRevision: flow.revision,
      currentNodeId: flow.startNodeId,
      history: [],
      selections: existing ? storySelectionsForReview(chapterId, existing) : [],
      acknowledgedChoiceIds: existing
        ? storySelectionsForReview(chapterId, existing).map((selection) => selection.pointId)
        : [],
      reviewOnly: Boolean(existing),
      startedAt: new Date().toISOString()
    }
    persist()
    return true
  }

  function advanceStoryNode() {
    const session = s.value.activeStorySession
    const flow = session && getStoryFlow(session.chapterId)
    const node = flow?.nodes[session?.currentNodeId ?? '']
    if (!session || !flow || node?.type !== 'dialogue') return false
    session.history.push(node.id)
    session.currentNodeId = node.next
    persist()
    return true
  }

  function chooseStoryOption(pointId: string, optionId: string) {
    const session = s.value.activeStorySession
    const flow = session && getStoryFlow(session.chapterId)
    const node = flow?.nodes[pointId]
    if (
      !session ||
      !flow ||
      session.currentNodeId !== pointId ||
      node?.type !== 'choice' ||
      session.reviewOnly ||
      session.selections.some((selection) => selection.pointId === pointId)
    ) {
      return false
    }
    const option = node.options.find((candidate) => candidate.id === optionId)
    if (!option) return false
    session.selections.push({ pointId, optionId })
    session.history.push(node.id)
    session.currentNodeId = option.next
    persist()
    return true
  }

  function continueReviewedStoryChoice() {
    const session = s.value.activeStorySession
    const flow = session && getStoryFlow(session.chapterId)
    const node = flow?.nodes[session?.currentNodeId ?? '']
    if (!session || !flow || node?.type !== 'choice') return false
    const selection = session.selections.find((item) => item.pointId === node.id)
    const option = node.options.find((item) => item.id === selection?.optionId)
    if (!option) return false
    session.history.push(node.id)
    session.currentNodeId = option.next
    persist()
    return true
  }

  function acknowledgeStoryChoice(pointId: string) {
    const session = s.value.activeStorySession
    if (!session || !session.selections.some((selection) => selection.pointId === pointId)) {
      return false
    }
    if (!session.acknowledgedChoiceIds.includes(pointId)) {
      session.acknowledgedChoiceIds.push(pointId)
      persist()
    }
    return true
  }

  function previousStoryNode() {
    const session = s.value.activeStorySession
    if (!session?.history.length) return false
    const previousId = session.history.pop()
    if (!previousId) return false
    session.currentNodeId = previousId
    persist()
    return true
  }

  function completeStorySession(): ChoiceResult | null {
    const session = s.value.activeStorySession
    const flow = session && getStoryFlow(session.chapterId)
    const node = flow?.nodes[session?.currentNodeId ?? '']
    if (!session || !flow || node?.type !== 'ending') return null
    const characterProgress = s.value.characterProgress[session.characterId]
    const existing = characterProgress.answers[session.chapterId]
    if (existing) {
      s.value.activeStorySession = null
      persist()
      return existing
    }
    const results = storyChoiceResults(flow, session.selections)
    const requiredChoices = Object.values(flow.nodes).filter(
      (node) => node.type === 'choice'
    ).length
    if (!requiredChoices || results.length !== requiredChoices) return null
    const { affectionChange, trustChange, englishXp } = storyRewards(results)
    const result: ChoiceResult = {
      characterId: session.characterId,
      chapterId: session.chapterId,
      choice: legacyChoiceFromStoryResult(results.at(-1)!),
      storyChoices: results,
      totalAffectionChange: affectionChange,
      totalTrustChange: trustChange,
      totalEnglishXp: englishXp,
      contentRevision: flow.revision,
      completedAt: new Date().toISOString()
    }
    if (!characterProgress.completed.includes(session.chapterId)) {
      characterProgress.affection = clampRelationship(characterProgress.affection + affectionChange)
      characterProgress.trust = clampRelationship(characterProgress.trust + trustChange)
      s.value.xp += englishXp
      characterProgress.completed.push(session.chapterId)
      recordStudyActivity({
        xpEarned: englishXp,
        storySessions: 1,
        vocabularySessions: 0,
        vocabularyQuestionsAnswered: 0,
        questionsAnswered: results.length,
        correctAnswers: results.filter(
          (choiceResult) => choiceResult.affectionChange > 0 || choiceResult.trustChange > 0
        ).length
      })
      markStudyDay()
    }
    characterProgress.answers[session.chapterId] = result
    s.value.activeStorySession = null
    persist()
    return result
  }

  return {
    startStorySession,
    advanceStoryNode,
    chooseStoryOption,
    continueReviewedStoryChoice,
    acknowledgeStoryChoice,
    previousStoryNode,
    completeStorySession
  }
}
