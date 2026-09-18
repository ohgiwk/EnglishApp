import { vocabularyLevels, vocabularyWords } from '../data/vocabulary'
import type { StoryChoiceResult, WordProgress } from '../types'

export const clampRelationship = (value: number) => Math.max(0, Math.min(100, value))

export function storyRewards(results: StoryChoiceResult[]) {
  const bounded = (value: number) => Math.max(-3, Math.min(6, value))
  return {
    affectionChange: bounded(results.reduce((sum, result) => sum + result.affectionChange, 0)),
    trustChange: bounded(results.reduce((sum, result) => sum + result.trustChange, 0)),
    englishXp: results.reduce((sum, result) => sum + result.englishXp, 0)
  }
}

export function vocabularyUnlockLevel(progress: Record<string, WordProgress>, current: number) {
  return vocabularyLevels.slice(0, -1).reduce((unlocked, level, index) => {
    const words = vocabularyWords.filter((word) => word.level === level.id)
    const mastered = words.filter((word) => progress[word.id]?.status === 'mastered').length
    return words.length && mastered / words.length >= 0.7
      ? Math.max(unlocked, vocabularyLevels[index + 1].id)
      : unlocked
  }, current)
}
