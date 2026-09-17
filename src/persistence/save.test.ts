import { describe, expect, it } from 'vitest'
import { chapters } from '../data/chapters'
import { getStoryFlow } from '../data/story-flows'
import { defaults, migrateSave } from './save'

const completedAt = new Date(2026, 8, 17, 0, 30).toISOString()
const day = '2026-09-17'
const result = {
  sessionId: 'saved-session',
  level: 1,
  totalCount: 10,
  correctCount: 8,
  earnedXp: 30,
  completedAt
}

describe('save validation and migration', () => {
  it('repairs corrupted entries without discarding valid progress', () => {
    const migrated = migrateSave({
      version: 5,
      name: 'Keiya',
      xp: 200,
      studyDays: 12,
      characterProgress: {
        emma: {
          affection: 50,
          trust: 40,
          completed: [1, 2],
          answers: { 1: { choice: chapters[0].scene.choices![0] }, 2: null },
          reviews: ['valid', null, 5]
        }
      },
      dailyStudyStats: {
        '2026-09-16': null,
        [day]: { questionsAnswered: 10, correctAnswers: 8, vocabularySessions: 1 },
        '2026-02-30': { questionsAnswered: 3 }
      },
      vocabularyResults: [null, {}, result],
      wordProgress: {
        v0001: { status: 'mastered', correctSessions: ['a', 'b'], correctCount: 2 },
        v0002: null
      }
    })
    expect(migrated).toMatchObject({ version: 6, name: 'Keiya', xp: 200, studyDays: 12 })
    expect(migrated.characterProgress.emma).toMatchObject({
      affection: 50,
      trust: 40,
      completed: [1, 2],
      reviews: ['valid']
    })
    expect(Object.keys(migrated.characterProgress.emma.answers)).toEqual(['1'])
    expect(Object.keys(migrated.dailyStudyStats)).toEqual([day])
    expect(migrated.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(10)
    expect(migrated.wordProgress.v0001.status).toBe('mastered')
    expect(migrated.wordProgress.v0002).toBeUndefined()
    expect(migrated.vocabularyResults).toHaveLength(1)
  })

  it.each(['oops', Infinity, NaN, {}, [], null])('normalizes invalid numbers: %s', (invalid) => {
    const saved = migrateSave({
      version: 5,
      xp: invalid,
      studyDays: invalid,
      unlockedVocabularyLevel: invalid,
      characterProgress: { emma: { affection: invalid } },
      lifetimeStudyStats: { questionsAnswered: invalid, correctAnswers: invalid },
      dailyStudyStats: { [day]: { questionsAnswered: invalid, xpEarned: invalid } }
    })
    expect(saved.xp).toBe(0)
    expect(saved.studyDays).toBe(0)
    expect(saved.unlockedVocabularyLevel).toBe(1)
    expect(saved.characterProgress.emma.affection).toBe(18)
    expect(saved.lifetimeStudyStats.questionsAnswered).toBe(0)
    expect(saved.dailyStudyStats[day].xpEarned).toBe(0)
  })

  it('enforces integer ranges and bounds correct answers by the total', () => {
    const saved = migrateSave({
      version: 6,
      xp: -1,
      studyDays: 2.8,
      unlockedVocabularyLevel: 999,
      lifetimeStudyStats: { questionsAnswered: 5, correctAnswers: 10 },
      dailyStudyStats: {
        [day]: { questionsAnswered: 5, correctAnswers: 10, vocabularyQuestionsAnswered: 9 }
      }
    })
    expect(saved.xp).toBe(0)
    expect(saved.studyDays).toBe(2)
    expect(saved.unlockedVocabularyLevel).toBe(6)
    expect(saved.lifetimeStudyStats.correctAnswers).toBe(5)
    expect(saved.dailyStudyStats[day]).toMatchObject({
      correctAnswers: 5,
      vocabularyQuestionsAnswered: 5
    })
  })

  it('handles corrupt story selections without losing the active node', () => {
    const flow = getStoryFlow(1)
    const saved = migrateSave({
      version: 5,
      activeStorySession: {
        characterId: 'emma',
        chapterId: 1,
        contentRevision: flow.revision,
        currentNodeId: flow.startNodeId,
        selections: [null, 42, {}],
        history: [null, flow.startNodeId],
        acknowledgedChoiceIds: [null]
      }
    })
    expect(saved.activeStorySession?.currentNodeId).toBe(flow.startNodeId)
    expect(saved.activeStorySession?.selections).toEqual([])
    expect(saved.activeStorySession?.history).toEqual([flow.startNodeId])
  })

  it('does not let malformed nested identifiers reset unrelated progress', () => {
    const malformed = { valueOf: null, toString: null }
    const flow = getStoryFlow(1)
    for (const activeStorySession of [
      { chapterId: malformed },
      { chapterId: 1, contentRevision: flow.revision, currentNodeId: malformed },
      {
        chapterId: 1,
        contentRevision: flow.revision,
        currentNodeId: flow.startNodeId,
        selections: [{ pointId: malformed }],
        history: [malformed]
      }
    ]) {
      const saved = migrateSave({ version: malformed, name: 'Keiya', xp: 100, activeStorySession })
      expect(saved).toMatchObject({ name: 'Keiya', xp: 100 })
    }
  })

  it('uses local calendar days to migrate old UTC timestamps', () => {
    const saved = migrateSave({ version: 3, vocabularyResults: [result] })
    expect(Object.keys(saved.dailyStudyStats)).toEqual([day])
    expect(saved.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(10)
  })

  it('restores old vocabulary-only totals beyond retained history', () => {
    const saved = migrateSave({
      version: 5,
      vocabularyResults: [result],
      dailyStudyStats: {
        [day]: { questionsAnswered: 310, vocabularySessions: 31, storySessions: 0 }
      }
    })
    expect(saved.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(310)
    expect(migrateSave(saved).dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(310)
  })

  it('does not count story answers as vocabulary when migrating mixed days', () => {
    const saved = migrateSave({
      version: 5,
      vocabularyResults: [result],
      dailyStudyStats: { [day]: { questionsAnswered: 13, vocabularySessions: 1, storySessions: 1 } }
    })
    expect(saved.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(10)
  })

  it('recovers mixed-day counts from dated story results after vocabulary history was pruned', () => {
    const flow = getStoryFlow(1)
    const nodes = Object.values(flow.nodes).filter((node) => node.type === 'choice')
    const storyChoices = nodes.map((node) => ({
      ...node.options[0],
      pointId: node.id,
      optionId: node.options[0].id,
      learningCue: node.learningCue
    }))
    const saved = migrateSave({
      version: 5,
      vocabularyResults: [result],
      characterProgress: {
        emma: {
          answers: {
            1: {
              choice: chapters[0].scene.choices![0],
              completedAt,
              storyChoices
            }
          }
        }
      },
      dailyStudyStats: {
        [day]: { questionsAnswered: 313, vocabularySessions: 31, storySessions: 1 }
      }
    })
    expect(saved.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(310)
  })

  it('preserves new-format counts and clean defaults across repeated migrations', () => {
    expect(migrateSave(defaults())).toEqual(defaults())
    const saved = migrateSave({
      ...defaults(),
      dailyStudyStats: {
        [day]: { vocabularyQuestionsAnswered: 310, questionsAnswered: 313, storySessions: 1 }
      }
    })
    expect(migrateSave(saved)).toEqual(saved)
    expect(saved.dailyStudyStats[day].vocabularyQuestionsAnswered).toBe(310)
  })
})
