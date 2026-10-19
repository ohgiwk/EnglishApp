/// <reference types="node" />
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { vocabularyLevels, vocabularyWords } from './vocabulary'
import {
  buildVocabularySession,
  buildReorder,
  buildFillBlank,
  supportsSentenceExercise
} from './vocabulary-engine'
import catalog from './vocabulary-catalog'
import { migrateSave } from '../persistence/save'

const original = vocabularyWords.filter((word) => Number(word.id.slice(1)) <= 1000)

describe('staged vocabulary expansion', () => {
  it('preserves all original ID and case-normalized headword pairs', () => {
    expect(original).toHaveLength(1000)
    expect(
      createHash('sha256')
        .update(JSON.stringify(original.map(({ id, word }) => [id, word.toLowerCase()])))
        .digest('hex')
    ).toBe('e7e5b934ef65f4efcaa2f071807e3c4c442c3ade87c523d829380147b3bc4fcc')
  })

  it('distinguishes published counts, editorial targets and pending reviews', () => {
    expect(vocabularyLevels.map((level) => level.targetWordCount)).toEqual([
      1000, 1200, 1000, 800, 600, 400
    ])
    expect(vocabularyLevels.reduce((sum, level) => sum + level.wordCount, 0)).toBe(5034)
    expect(
      vocabularyWords.filter((word) => word.editorial?.reviewStatus === 'reviewed')
    ).toHaveLength(5034)
    for (const word of vocabularyWords) {
      expect(word.editorial?.recommendedLevel).toBe(word.level)
      expect(word.editorial?.reason).toBeTruthy()
      expect(word.editorial?.references.length).toBeGreaterThan(0)
    }
  })

  it('uses the audited catalog example in display, fill and reorder even with a legacy override', () => {
    const batch = catalog.filter((word) => Number(word.id.slice(1)) <= 1000)
    expect(batch).toHaveLength(1000)
    for (const source of batch) {
      const word = vocabularyWords.find((word) => word.id === source.id)!
      expect(word.editorial?.reviewStatus).toBe('reviewed')
      expect(word.example).toBe(source.example)
      expect(word.exampleJa).toBe(source.exampleJa)
      expect(buildReorder(word).prompt).toBe(source.example)
      expect(buildReorder(word).promptJa).toBe(source.exampleJa)
      expect(buildFillBlank(word).sentence).toBe(source.example)
    }
    const home = vocabularyWords.find((word) => word.word === 'home')!
    expect(home.partOfSpeech).toBe('noun')
    expect(home.example).toBe('Our home is near the station.')
    expect(home.additionalMeanings?.[0].partOfSpeech).toBe('adverb')
  })

  it('corrects representative grammatical roles without changing headword IDs', () => {
    for (const [head, pos] of Object.entries({
      music: 'noun',
      time: 'noun',
      world: 'noun',
      that: 'other',
      new: 'adjective',
      use: 'verb',
      up: 'adverb',
      should: 'verb',
      post: 'noun'
    })) {
      expect(vocabularyWords.find((word) => word.word === head)?.partOfSpeech).toBe(pos)
    }
    for (const head of ['state', 'view', 'system', 'product']) {
      expect(vocabularyWords.find((word) => word.word === head)?.level).toBe(3)
    }
  })

  it('adds reviewed vocabulary with authored bilingual exercises', () => {
    const added = vocabularyWords.filter((word) => Number(word.id.slice(1)) > 1000)
    expect(added).toHaveLength(4034)
    for (const word of added) {
      expect(word.editorial?.reviewStatus).toBe('reviewed')
      expect(word.exampleInfo?.source).toBe('authored')
      expect(supportsSentenceExercise(word, 'fill-blank')).toBe(true)
      expect(supportsSentenceExercise(word, 'reorder')).toBe(true)
    }
    for (const head of [
      'teacher',
      'sister',
      'apple',
      'lunch',
      'dinner',
      'autumn',
      'evidence',
      'environment',
      'privacy',
      'software',
      'online',
      'email',
      'I',
      'a',
      'an'
    ]) {
      expect(added.some((word) => word.word === head)).toBe(true)
    }
  })

  it('corrects basic words and preserves their saved learning records', () => {
    const progress = Object.fromEntries(
      ['mother', 'father', 'brother', 'breakfast', 'finish'].map((head) => {
        const word = vocabularyWords.find((word) => word.word === head)!
        expect(word.level).toBe(1)
        expect(word.partOfSpeech).toBe(head === 'finish' ? 'verb' : 'noun')
        return [
          word.id,
          {
            status: 'mastered',
            correctSessions: ['before-a', 'before-b'],
            correctCount: 7,
            incorrectCount: 2,
            lastStudiedAt: '2026-09-30T01:00:00.000Z'
          }
        ]
      })
    )
    const migrated = migrateSave({
      version: 7,
      wordProgress: progress,
      passedExamLevels: [1],
      eligibleExamLevels: [1],
      unlockedVocabularyLevel: 2
    })
    expect(migrated.wordProgress).toEqual(progress)
    expect(migrated.passedExamLevels).toEqual([1])
    expect(migrated.unlockedVocabularyLevel).toBe(2)
    const roundTrip = migrateSave(JSON.parse(JSON.stringify(migrated)))
    expect(roundTrip.wordProgress).toEqual(progress)
    const session = buildVocabularySession(
      1,
      roundTrip.wordProgress,
      () => 0.42,
      'review',
      'flashcard',
      'all',
      ['mastered']
    )
    expect(session.questions.map((question) => question.wordId).sort()).toEqual(
      Object.keys(progress).sort()
    )
  })

  it('provides additional meanings without replacing primary quiz meanings', () => {
    for (const head of ['issue', 'address']) {
      const word = vocabularyWords.find((word) => word.word === head)!
      expect(word.partOfSpeech).toBe('noun')
      expect(word.additionalMeanings?.[0].partOfSpeech).toBe('verb')
      expect(word.additionalMeanings?.[0].exampleJa).toBeTruthy()
    }
  })

  it.each(vocabularyLevels.map((level) => level.id))(
    'builds up to 10, 20 and 50 unique questions within the available level %i pool',
    (level) => {
      for (const count of [10, 20, 50]) {
        for (const mode of [
          'mixed',
          'en-to-ja',
          'ja-to-en',
          'flashcard',
          'fill-blank',
          'reorder'
        ] as const) {
          const session = buildVocabularySession(level, {}, () => 0.42, 'expanded', mode, count)
          const available = vocabularyWords.filter((word) => word.level === level).length
          const expectedCount = Math.min(count, available)
          expect(session.questions).toHaveLength(expectedCount)
          expect(new Set(session.questions.map((question) => question.wordId)).size).toBe(
            expectedCount
          )
          for (const question of session.questions) {
            expect(vocabularyWords.find((word) => word.id === question.wordId)?.level).toBe(level)
            if (['en-to-ja', 'ja-to-en', 'fill-blank'].includes(question.type))
              expect(new Set(question.options).size).toBe(4)
          }
        }
      }
    }
  )
})
