import { describe, expect, it } from 'vitest'
import { buildVocabularySession, rewardForAccuracy } from './vocabulary-engine'
import { vocabularyLevels, vocabularyWords } from './vocabulary'

describe('vocabulary data', () => {
  it('contains exactly 1,000 complete, unique words in the planned level sizes', () => {
    expect(vocabularyWords).toHaveLength(1000)
    expect(new Set(vocabularyWords.map((word) => word.id)).size).toBe(1000)
    expect(new Set(vocabularyWords.map((word) => word.word)).size).toBe(1000)
    expect(
      vocabularyLevels.map(
        (level) => vocabularyWords.filter((word) => word.level === level.id).length
      )
    ).toEqual([150, 170, 170, 170, 170, 170])
    expect(
      vocabularyWords.every(
        (word) =>
          word.word &&
          word.meaningJa &&
          word.partOfSpeech &&
          word.example &&
          word.exampleJa &&
          word.category
      )
    ).toBe(true)
  })

  it('builds a ten-question 4/4/2 mixed session with unique choices', () => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'test-session')
    expect(session.questions).toHaveLength(10)
    expect(session.questions.filter((question) => question.type === 'en-to-ja')).toHaveLength(4)
    expect(session.questions.filter((question) => question.type === 'ja-to-en')).toHaveLength(4)
    expect(session.questions.filter((question) => question.type === 'flashcard')).toHaveLength(2)
    for (const question of session.questions.filter((item) => item.type !== 'flashcard')) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
    }
  })

  it('uses the fixed reward bands without negative rewards', () => {
    expect(rewardForAccuracy(40)).toEqual({ earnedXp: 10, affectionChange: 1, trustChange: 0 })
    expect(rewardForAccuracy(70)).toEqual({ earnedXp: 20, affectionChange: 2, trustChange: 1 })
    expect(rewardForAccuracy(90)).toEqual({ earnedXp: 30, affectionChange: 3, trustChange: 2 })
  })
})
