import type { StoryChoiceResult } from '../types'

export const clampRelationship = (value: number) => Math.max(0, Math.min(100, value))

export function storyRewards(results: StoryChoiceResult[]) {
  const bounded = (value: number) => Math.max(-3, Math.min(6, value))
  return {
    affectionChange: bounded(results.reduce((sum, result) => sum + result.affectionChange, 0)),
    trustChange: bounded(results.reduce((sum, result) => sum + result.trustChange, 0)),
    englishXp: results.reduce((sum, result) => sum + result.englishXp, 0)
  }
}
