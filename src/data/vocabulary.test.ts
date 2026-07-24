import { describe, expect, it } from 'vitest'
import {
  buildFillBlank,
  buildReorder,
  buildVocabularySession,
  hasNaturalReorderExample,
  rewardForAccuracy
} from './vocabulary-engine'
import { reorderExamples } from './reorder-examples'
import { vocabularyLevels, vocabularyWords } from './vocabulary'
import { exampleSourceFor } from './vocabulary-examples'

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

  it('provides a complete, non-meta bilingual example for every word', () => {
    for (const word of vocabularyWords) {
      const escapedWord = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(word.example).toMatch(new RegExp(`(^|\\b)${escapedWord}(\\b|$)`, 'i'))
      expect(word.example).not.toMatch(/vocabulary notebook|\bthe word\b/i)
      expect(word.example).not.toMatch(/["“”[\]]/)
      expect(word.exampleJa.trim()).not.toBe('')
      expect(word.exampleJa).not.toMatch(/単語ノート|「|」/)
    }
  })

  it('keeps example generation auditable and varied across all levels', () => {
    const sources = vocabularyWords.map(exampleSourceFor)
    expect(sources.filter((source) => source === 'curated').length).toBe(
      Object.keys(reorderExamples).length
    )
    expect(sources.filter((source) => source === 'core').length).toBeGreaterThanOrEqual(60)
    expect(sources.filter((source) => source === 'generated').length).toBeGreaterThan(800)

    for (const level of vocabularyLevels) {
      const examples = vocabularyWords
        .filter((word) => word.level === level.id)
        .map((word) => word.example)
      expect(new Set(examples).size).toBe(examples.length)
      expect(examples.some((example) => example.includes(' after class.'))).toBe(true)
      expect(examples.some((example) => !example.includes(' after class.'))).toBe(true)
    }
  })

  it('uses natural representative sentences for common grammatical roles', () => {
    const expected = {
      the: 'The train arrived on time.',
      with: 'I had lunch with my sister.',
      because: 'We stayed inside because it was raining.',
      must: 'We must leave before dark.'
    }
    for (const [target, sentence] of Object.entries(expected)) {
      expect(vocabularyWords.find((word) => word.word === target)?.example).toBe(sentence)
    }
  })

  it('builds a balanced ten-question mixed session with unique choices', () => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'test-session')
    expect(session.questions).toHaveLength(10)
    expect(session.mode).toBe('mixed')
    expect(session.questions.filter((question) => question.type === 'en-to-ja')).toHaveLength(2)
    expect(session.questions.filter((question) => question.type === 'ja-to-en')).toHaveLength(2)
    expect(session.questions.filter((question) => question.type === 'flashcard')).toHaveLength(2)
    expect(session.questions.filter((question) => question.type === 'fill-blank')).toHaveLength(2)
    expect(session.questions.filter((question) => question.type === 'reorder')).toHaveLength(2)
    for (const question of session.questions.filter(
      (item) => item.type === 'en-to-ja' || item.type === 'ja-to-en'
    )) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
    }
  })

  it.each(['en-to-ja', 'ja-to-en', 'flashcard', 'fill-blank', 'reorder'] as const)(
    'builds ten %s questions in an individual mode',
    (mode) => {
      const session = buildVocabularySession(1, {}, () => 0.42, 'test-session', mode)
      expect(session.mode).toBe(mode)
      expect(session.questions).toHaveLength(10)
      expect(session.questions.every((question) => question.type === mode)).toBe(true)
    }
  )

  it('creates resumable fill and reorder payloads', () => {
    const fillWord = vocabularyWords[0]
    const fill = buildFillBlank(fillWord)
    expect(fill.prompt).toContain('____')
    expect(fill.prompt).not.toContain(`“${fillWord.word}”`)
    expect(fill.answer).toBe(fillWord.word)

    const word = vocabularyWords.find((item) => item.id === 'v0026')!
    const reorder = buildReorder(word, () => 0.42)
    expect(reorder.tokens).toHaveLength(reorder.correctOrder.length)
    expect(new Set(reorder.tokens.map((token) => token.id))).toEqual(new Set(reorder.correctOrder))
    expect(reorder.tokens.map((token) => token.id)).not.toEqual(reorder.correctOrder)
    expect(reorder.prompt).toContain(word.word)
    expect(reorder.promptJa).toBe(reorderExamples[word.id].japanese)
  })

  it('generates valid fill payloads for all vocabulary words', () => {
    for (const word of vocabularyWords) {
      const fill = buildFillBlank(word)
      expect(fill.prompt).toContain('____')
      expect(fill.answer).toBe(word.word)
    }
  })

  it('provides ten safe natural reorder examples in every level', () => {
    for (const level of vocabularyLevels) {
      const naturalWords = vocabularyWords.filter(
        (word) => word.level === level.id && hasNaturalReorderExample(word)
      )
      expect(naturalWords.length).toBeGreaterThanOrEqual(10)
      const session = buildVocabularySession(
        level.id,
        {},
        () => 0.42,
        `reorder-level-${level.id}`,
        'reorder'
      )
      expect(session.questions).toHaveLength(10)
      for (const question of session.questions) {
        const word = vocabularyWords.find((item) => item.id === question.wordId)!
        expect(hasNaturalReorderExample(word)).toBe(true)
        expect(question.prompt?.toLocaleLowerCase()).toContain(word.word.toLocaleLowerCase())
        expect(question.prompt).not.toMatch(/["'“”‘’[\]]/)
        expect(question.prompt).not.toMatch(/\bthe word\b/i)
        expect(question.promptJa).toBeTruthy()
        expect(question.tokens?.length).toBeGreaterThan(1)
      }
    }
  })

  it('keeps every curated reorder pair natural and structurally valid', () => {
    for (const [wordId, example] of Object.entries(reorderExamples)) {
      const word = vocabularyWords.find((item) => item.id === wordId)!
      expect(word).toBeTruthy()
      const reorder = buildReorder(word, () => 0.42)
      expect(reorder.tokens.length).toBeGreaterThan(1)
      expect(reorder.tokens).toHaveLength(reorder.correctOrder.length)
      expect(reorder.prompt).toBe(example.english)
      expect(reorder.promptJa).toBe(example.japanese)
      expect(reorder.prompt.toLocaleLowerCase()).toContain(word.word.toLocaleLowerCase())
      expect(reorder.prompt).not.toMatch(/["'“”‘’[\]]/)
      expect(reorder.prompt).not.toMatch(/\bthe word\b/i)
    }
  })

  it('rejects unsafe words instead of inventing a misleading reorder sentence', () => {
    const word = {
      ...vocabularyWords[0],
      word: 'fallback',
      meaningJa: '代替',
      example: 'This sentence does not contain the target.',
      exampleJa: ''
    }
    expect(hasNaturalReorderExample(word)).toBe(false)
    expect(() => buildReorder(word, () => 0.42)).toThrow('No natural reorder example')
  })

  it('preserves future curated bilingual examples', () => {
    const word = {
      ...vocabularyWords[0],
      word: 'bright',
      meaningJa: '明るい',
      example: 'The room felt bright in the morning sun.',
      exampleJa: '朝日の中で、その部屋は明るく感じられました。'
    }
    const reorder = buildReorder(word, () => 0.42)
    expect(reorder.prompt).toBe(word.example)
    expect(reorder.promptJa).toBe(word.exampleJa)
  })

  it('uses the fixed reward bands without negative rewards', () => {
    expect(rewardForAccuracy(40)).toEqual({ earnedXp: 10, affectionChange: 1, trustChange: 0 })
    expect(rewardForAccuracy(70)).toEqual({ earnedXp: 20, affectionChange: 2, trustChange: 1 })
    expect(rewardForAccuracy(90)).toEqual({ earnedXp: 30, affectionChange: 3, trustChange: 2 })
  })
})
