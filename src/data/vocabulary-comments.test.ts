import { describe, expect, it } from 'vitest'
import { vocabularyCommentFor, type VocabularyCommentState } from './vocabulary-comments'

describe('vocabulary session comments', () => {
  const states: VocabularyCommentState[] = ['waiting', 'correct', 'incorrect']

  it.each(states)('selects stable, varied %s comments by question', (state) => {
    const keys = Array.from({ length: 20 }, (_, index) => `v${String(index + 1).padStart(4, '0')}`)
    const selected = keys.map((key) => vocabularyCommentFor(key, state))
    expect(vocabularyCommentFor(keys[0], state)).toEqual(vocabularyCommentFor(keys[0], state))
    expect(new Set(selected.map((comment) => comment.japanese)).size).toBeGreaterThanOrEqual(3)
    expect(selected.every((comment) => comment.english && comment.japanese)).toBe(true)
  })
})
