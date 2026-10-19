import { expect, it, vi } from 'vitest'
import { vocabularyLevels, vocabularyWords } from './vocabulary'
import { buildVocabularySession } from './vocabulary-engine'

// Exercise shortages even after every production level has enough words.
vi.mock('./vocabulary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./vocabulary')>()
  const retained = new Set(
    actual.vocabularyWords
      .filter((word) => word.level === 4)
      .slice(0, 3)
      .map((word) => word.id)
  )
  const words = actual.vocabularyWords.filter((word) => word.level !== 4 || retained.has(word.id))
  return {
    ...actual,
    vocabularyWords: words,
    vocabularyLevels: actual.vocabularyLevels.map((level) => ({
      ...level,
      wordCount: words.filter((word) => word.level === level.id).length
    }))
  }
})

it('borrows only lower-level distractors when a level has fewer than four words', () => {
  const level = vocabularyLevels.find((item) => item.id === 4)!
  expect(level.wordCount).toBe(3)
  expect(vocabularyWords.some((word) => word.level > level.id)).toBe(true)
  for (const mode of ['en-to-ja', 'ja-to-en', 'fill-blank'] as const) {
    const session = buildVocabularySession(level.id, {}, () => 0.42, 'small-level', mode, 50)
    expect(session.questions).toHaveLength(level.wordCount)
    for (const question of session.questions) {
      const word = vocabularyWords.find((item) => item.id === question.wordId)!
      expect(word.level).toBe(level.id)
      const answer = mode === 'en-to-ja' ? word.meaningJa : word.word
      expect(question.options.filter((value) => value === answer)).toHaveLength(1)
      expect(new Set(question.options).size).toBe(4)
      for (const option of question.options) {
        expect(
          vocabularyWords.some(
            (candidate) =>
              candidate.level <= level.id &&
              (mode === 'en-to-ja' ? candidate.meaningJa : candidate.word) === option
          )
        ).toBe(true)
      }
    }
  }
})
