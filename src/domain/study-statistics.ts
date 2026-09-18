import type { SaveData } from '../persistence/save'
import type { DailyStudyStats } from '../types'

export function recordStudyActivity(
  save: SaveData,
  activity: Omit<DailyStudyStats, 'date'>,
  date: string
) {
  const current = save.dailyStudyStats[date] ?? {
    date,
    vocabularyQuestionsAnswered: 0,
    xpEarned: 0,
    storySessions: 0,
    vocabularySessions: 0,
    questionsAnswered: 0,
    correctAnswers: 0
  }
  current.vocabularyQuestionsAnswered += activity.vocabularyQuestionsAnswered
  current.xpEarned += activity.xpEarned
  current.storySessions += activity.storySessions
  current.vocabularySessions += activity.vocabularySessions
  current.questionsAnswered += activity.questionsAnswered
  current.correctAnswers += activity.correctAnswers
  save.dailyStudyStats[date] = current
  save.lifetimeStudyStats.storySessions += activity.storySessions
  save.lifetimeStudyStats.vocabularySessions += activity.vocabularySessions
  save.lifetimeStudyStats.questionsAnswered += activity.questionsAnswered
  save.lifetimeStudyStats.correctAnswers += activity.correctAnswers
  const retained = Object.keys(save.dailyStudyStats).sort().slice(-365)
  save.dailyStudyStats = Object.fromEntries(retained.map((key) => [key, save.dailyStudyStats[key]]))
}
