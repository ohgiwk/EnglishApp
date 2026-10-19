import { describe, expect, it } from 'vitest'
import {
  buildFillBlank,
  buildReorder,
  buildVocabularySession,
  hasReorderExample,
  supportsSentenceExercise,
  isCorrectReorder,
  rewardForAccuracy,
  summarizeVocabularySession
} from './vocabulary-engine'
import { vocabularyLevels, vocabularyWords } from './vocabulary'
import catalog from './vocabulary-catalog'

const levelOneCount = vocabularyLevels[0].wordCount

describe('vocabulary data', () => {
  it('blanks the whole target word instead of a substring in another word', () => {
    const word = vocabularyWords.find((item) => item.word === 'out')!
    const fill = buildFillBlank(word)
    expect(fill.prompt).toBe('The cat jumped ____ of the box.')
    expect(fill.sentence).toBe(word.example)
    expect(fill.prompt.replace('____', fill.answer)).toBe(fill.sentence)
  })

  it('preserves sentence capitalization and handles missing standalone words', () => {
    const word = vocabularyWords[0]
    expect(buildFillBlank({ ...word, word: 'the', example: 'The train arrived.' }).sentence).toBe(
      'The train arrived.'
    )
    const fill = buildFillBlank({ ...word, word: 'out', example: 'We talked about it.' })
    expect(fill.prompt).toBe('Emma wrote “____” in her vocabulary notebook.')
    expect(fill.sentence).toBe('Emma wrote “out” in her vocabulary notebook.')
  })

  it('accepts interchangeable identical tokens but rejects wrong or reused tokens', () => {
    const word = vocabularyWords.find((item) => item.word === 'do')!
    const question = buildReorder(word, () => 0.42)
    const ids = [...question.correctOrder]
    const duplicates = question.tokens.filter((token) => token.text === 'do')
    const a = ids.indexOf(duplicates[0].id)
    const b = ids.indexOf(duplicates[1].id)
    ;[ids[a], ids[b]] = [ids[b], ids[a]]
    expect(isCorrectReorder(question, ids)).toBe(true)
    expect(isCorrectReorder(question, ids.slice(1))).toBe(false)
    expect(
      isCorrectReorder(
        question,
        ids.map((id, index) => (index === a ? ids[b] : id))
      )
    ).toBe(false)
    expect(isCorrectReorder(question, ['unknown', ...ids.slice(1)])).toBe(false)
    ;[ids[0], ids[1]] = [ids[1], ids[0]]
    expect(isCorrectReorder(question, ids)).toBe(false)
  })
  it('contains unique complete words and derives actual level sizes', () => {
    expect(vocabularyWords).toHaveLength(5034)
    expect(new Set(vocabularyWords.map((word) => word.id)).size).toBe(vocabularyWords.length)
    expect(new Set(vocabularyWords.map((word) => word.word)).size).toBe(vocabularyWords.length)
    expect(
      vocabularyLevels.map(
        (level) => vocabularyWords.filter((word) => word.level === level.id).length
      )
    ).toEqual(vocabularyLevels.map((level) => level.wordCount))
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
    const sources = vocabularyWords.map((word) => word.exampleInfo?.source)
    expect(sources.filter((source) => source === 'curated').length).toBe(
      catalog.filter((word) => word.exampleInfo?.source === 'curated').length
    )
    expect(sources.filter((source) => source === 'authored').length).toBe(
      catalog.filter((word) => word.exampleInfo?.source === 'authored').length
    )
    expect(sources.filter((source) => source === 'generated').length).toBe(
      vocabularyWords.filter((word) => word.exampleInfo?.reviewStatus === 'needs-review').length
    )

    for (const level of vocabularyLevels) {
      const examples = vocabularyWords
        .filter((word) => word.level === level.id)
        .map((word) => word.example)
      expect(new Set(examples).size).toBe(examples.length)
      expect(examples.every((example) => example.length > 0)).toBe(true)
    }
  })

  it('uses authored, varied examples for every level-one word and enables sentence practice', () => {
    const words = vocabularyWords.filter((word) => word.level === 1)
    expect(words).toHaveLength(levelOneCount)
    for (const word of words) {
      expect(word.exampleInfo?.source).not.toBe('generated')
      expect(supportsSentenceExercise(word, 'fill-blank')).toBe(true)
      expect(supportsSentenceExercise(word, 'reorder')).toBe(true)
      const fill = buildFillBlank(word)
      expect(fill.prompt.replace('____', fill.answer).toLowerCase()).toBe(
        word.example.toLowerCase()
      )
      expect(buildReorder(word, () => 0.42).promptJa).toBe(word.exampleJa)
    }
    expect(new Set(words.map((word) => word.example)).size).toBe(levelOneCount)
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

  it('builds a shuffled full-level mixed session without duplicate words', () => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'test-session')
    expect(session.questions).toHaveLength(levelOneCount)
    expect(new Set(session.questions.map((question) => question.wordId)).size).toBe(levelOneCount)
    expect(new Set(session.questions.map((question) => question.wordId))).toEqual(
      new Set(vocabularyWords.filter((word) => word.level === 1).map((word) => word.id))
    )
    expect(session.mode).toBe('mixed')
    expect(
      session.questions.filter((question) => question.type === 'en-to-ja').length
    ).toBeGreaterThanOrEqual(Math.floor(levelOneCount / 5))
    expect(session.questions.filter((question) => question.type === 'ja-to-en')).toHaveLength(
      Math.floor((levelOneCount + 3) / 5)
    )
    expect(session.questions.filter((question) => question.type === 'flashcard')).toHaveLength(
      Math.floor((levelOneCount + 2) / 5)
    )
    expect(
      session.questions.filter((question) => question.type === 'fill-blank').length
    ).toBeLessThanOrEqual(Math.ceil(levelOneCount / 5))
    expect(
      session.questions.filter((question) => question.type === 'reorder').length
    ).toBeLessThanOrEqual(Math.ceil(levelOneCount / 5))
    for (const question of session.questions.filter(
      (item) => item.type === 'en-to-ja' || item.type === 'ja-to-en'
    )) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
    }
  })

  it.each([10, 20, 50])('limits a session to %i unique random words', (count) => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'limited-session', 'mixed', count)
    expect(session.questions).toHaveLength(count)
    expect(new Set(session.questions.map((question) => question.wordId)).size).toBe(count)
  })

  it('filters questions by multiple selected learning statuses', () => {
    const progress = {
      v0001: {
        status: 'learning' as const,
        correctSessions: [],
        correctCount: 1,
        incorrectCount: 0,
        lastStudiedAt: '2026-09-17T00:00:00.000Z'
      },
      v0002: {
        status: 'mastered' as const,
        correctSessions: ['one', 'two'],
        correctCount: 2,
        incorrectCount: 0,
        lastStudiedAt: '2026-09-17T00:00:00.000Z'
      }
    }
    const session = buildVocabularySession(
      1,
      progress,
      () => 0.42,
      'filtered-session',
      'flashcard',
      'all',
      ['learning', 'mastered']
    )
    expect(session.questions.map((question) => question.wordId).sort()).toEqual(['v0001', 'v0002'])
  })

  it('keeps each studied word and its correctness in the session result', () => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'result-session', 'mixed', 10)
    session.answers = session.questions.map((question, index) => ({
      wordId: question.wordId,
      type: question.type,
      correct: index % 2 === 0,
      answeredAt: '2026-09-16T00:00:00.000Z'
    }))
    const result = summarizeVocabularySession(session, [], true)
    expect(result.answers).toEqual(session.answers)
    expect(result.answers).toHaveLength(10)
    expect(result.answers?.filter((answer) => answer.correct)).toHaveLength(5)
  })

  it('summarizes only answered words when a session ends early', () => {
    const session = buildVocabularySession(1, {}, () => 0.42, 'partial-session', 'mixed', 10)
    session.answers = session.questions.slice(0, 2).map((question, index) => ({
      wordId: question.wordId,
      type: question.type,
      correct: index === 0,
      answeredAt: '2026-09-16T00:00:00.000Z'
    }))
    const result = summarizeVocabularySession(session, [], true)
    expect(result.totalCount).toBe(2)
    expect(result.correctCount).toBe(1)
    expect(result.accuracy).toBe(50)
    expect(result.earnedXp).toBe(4)
  })

  it.each(['en-to-ja', 'ja-to-en', 'flashcard', 'fill-blank', 'reorder'] as const)(
    'builds every level word once in %s mode',
    (mode) => {
      const session = buildVocabularySession(1, {}, () => 0.42, 'test-session', mode)
      expect(session.mode).toBe(mode)
      expect(session.questions).toHaveLength(levelOneCount)
      expect(new Set(session.questions.map((question) => question.wordId)).size).toBe(levelOneCount)
      expect(
        session.questions.every((question) =>
          mode === 'reorder' || mode === 'fill-blank'
            ? question.type === mode || question.type === 'en-to-ja'
            : question.type === mode
        )
      ).toBe(true)
    }
  )

  it('creates resumable fill and reorder payloads', () => {
    const fillWord = vocabularyWords[0]
    const fill = buildFillBlank(fillWord)
    expect(fill.prompt).toContain('____')
    expect(fill.prompt).not.toContain(`“${fillWord.word}”`)
    expect(fill.answer).toBe(fillWord.word)
    expect(fill.options).toHaveLength(4)
    expect(new Set(fill.options).size).toBe(4)
    expect(fill.options).toContain(fill.answer)

    const word = vocabularyWords.find((item) => item.id === 'v0026')!
    const reorder = buildReorder(word, () => 0.42)
    expect(reorder.tokens).toHaveLength(reorder.correctOrder.length)
    expect(new Set(reorder.tokens.map((token) => token.id))).toEqual(new Set(reorder.correctOrder))
    expect(reorder.tokens.map((token) => token.id)).not.toEqual(reorder.correctOrder)
    expect(reorder.prompt).toContain(word.word)
    expect(reorder.promptJa).toBe(word.exampleJa)
  })

  it.each(vocabularyLevels)(
    'generates valid fill payloads for every word in level $id',
    (level) => {
      for (const word of vocabularyWords.filter((word) => word.level === level.id)) {
        const fill = buildFillBlank(word)
        expect(fill.prompt).toContain('____')
        expect(fill.answer).toBe(word.word)
      }
    }
  )

  it('keeps every level word in reorder sessions and safely falls back when needed', () => {
    for (const level of vocabularyLevels) {
      const naturalWords = vocabularyWords.filter(
        (word) => word.level === level.id && hasReorderExample(word)
      )
      expect(naturalWords.every((word) => word.exampleInfo?.reviewStatus === 'authored')).toBe(true)
      const session = buildVocabularySession(
        level.id,
        {},
        () => 0.42,
        `reorder-level-${level.id}`,
        'reorder'
      )
      expect(session.questions).toHaveLength(level.wordCount)
      expect(new Set(session.questions.map((question) => question.wordId)).size).toBe(
        level.wordCount
      )
      for (const question of session.questions) {
        const word = vocabularyWords.find((item) => item.id === question.wordId)!
        if (!hasReorderExample(word)) {
          expect(question.type).toBe('en-to-ja')
          continue
        }
        expect(question.type).toBe('reorder')
        if (question.type !== 'reorder') throw new Error('Expected reorder question')
        expect(question.prompt?.toLocaleLowerCase()).toContain(word.word.toLocaleLowerCase())
        expect(question.prompt).not.toMatch(/["'“”‘’[\]]/)
        expect(question.prompt).not.toMatch(/\bthe word\b/i)
        expect(question.promptJa).toBeTruthy()
        expect(question.tokens?.length).toBeGreaterThan(1)
      }
    }
  })

  it('keeps every authored or retained curated pair natural and structurally valid', () => {
    for (const word of vocabularyWords.filter(
      (word) => word.exampleInfo?.reviewStatus === 'authored'
    )) {
      expect(word).toBeTruthy()
      const reorder = buildReorder(word, () => 0.42)
      expect(reorder.tokens.length).toBeGreaterThan(1)
      expect(reorder.tokens).toHaveLength(reorder.correctOrder.length)
      expect(reorder.prompt).toBe(word.example)
      expect(reorder.promptJa).toBe(word.exampleJa)
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
    expect(hasReorderExample(word)).toBe(false)
    expect(() => buildReorder(word, () => 0.42)).toThrow('No eligible reorder example')
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

  it('does not use unreviewed generated examples for sentence exercises', () => {
    for (const level of vocabularyLevels) {
      for (const mode of ['fill-blank', 'reorder'] as const) {
        const session = buildVocabularySession(level.id, {}, () => 0.42, 'quality', mode)
        for (const question of session.questions) {
          const word = vocabularyWords.find((word) => word.id === question.wordId)!
          expect(question.type).toBe(supportsSentenceExercise(word, mode) ? mode : 'en-to-ja')
        }
      }
    }
  })

  it('uses the fixed reward bands without negative rewards', () => {
    expect(rewardForAccuracy(40, 10)).toEqual({
      earnedXp: 10,
      affectionChange: 1,
      trustChange: 0
    })
    expect(rewardForAccuracy(70, 20)).toEqual({
      earnedXp: 40,
      affectionChange: 2,
      trustChange: 1
    })
    expect(rewardForAccuracy(90, 50)).toEqual({
      earnedXp: 150,
      affectionChange: 3,
      trustChange: 2
    })
  })
})
