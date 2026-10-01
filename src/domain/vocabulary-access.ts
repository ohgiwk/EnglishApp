import { vocabularyLevels } from '../data/vocabulary'

// Temporary access override. Set to false to restore promotion-based access.
export const temporarilyUnlockAllLevels = true

export function accessibleVocabularyLevel(unlockedLevel: number) {
  return temporarilyUnlockAllLevels ? vocabularyLevels.at(-1)!.id : unlockedLevel
}
