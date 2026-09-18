import type { Ref, ComputedRef } from 'vue'
import type { SaveData } from '../../persistence/save'
import type { CharacterProgress, DailyStudyStats } from '../../types'

export interface StudyActionContext {
  s: Ref<SaveData>
  progress: ComputedRef<CharacterProgress>
  emmaProgress: ComputedRef<CharacterProgress>
  persist: () => void
  markStudyDay: () => void
  recordStudyActivity: (activity: Omit<DailyStudyStats, 'date'>) => void
}
