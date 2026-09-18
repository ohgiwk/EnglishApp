import { getCharacter } from '../../data/characters'
import { getStoryFlow } from '../../data/story-flows'
import { savedSelections } from '../../data/story-engine'
import type { ChoiceResult } from '../../types'
import type { StudyActionContext } from './context'
import { clampRelationship } from '../../domain/study-rewards'

// Compatibility for pre-branching saves. New UI completes stories through completeStorySession.
export function storySelectionsForReview(chapterId: number, result: ChoiceResult) {
  if (result.storyChoices?.length) return savedSelections(result.storyChoices)
  const flow = getStoryFlow(chapterId)
  if (!flow) return []
  const choiceNodes = Object.values(flow.nodes).filter((node) => node.type === 'choice')
  return choiceNodes.map((node, index) => {
    const legacyIndex = result.choice.id.endsWith('-b')
      ? 1
      : result.choice.id.endsWith('-c')
        ? 2
        : 0
    const optionIndex = index === choiceNodes.length - 1 ? legacyIndex : 0
    return { pointId: node.id, optionId: node.options[optionIndex]?.id ?? node.options[0].id }
  })
}

export function createLegacyStoryActions({
  s,
  persist,
  recordStudyActivity,
  markStudyDay
}: StudyActionContext) {
  function complete(result: ChoiceResult) {
    const character = getCharacter(result.characterId)
    if (character.availability !== 'available') return
    const characterProgress = s.value.characterProgress[character.id]
    if (!characterProgress.completed.includes(result.chapterId)) {
      characterProgress.affection = clampRelationship(
        characterProgress.affection + result.choice.affectionChange
      )
      characterProgress.trust = clampRelationship(
        characterProgress.trust + result.choice.trustChange
      )
      s.value.xp += result.choice.englishXp
      characterProgress.completed.push(result.chapterId)
      recordStudyActivity({
        xpEarned: result.choice.englishXp,
        storySessions: 1,
        vocabularySessions: 0,
        vocabularyQuestionsAnswered: 0,
        questionsAnswered: 0,
        correctAnswers: 0
      })
      markStudyDay()
    }
    characterProgress.answers[result.chapterId] = result
    persist()
  }

  return { complete }
}
