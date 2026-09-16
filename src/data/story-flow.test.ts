import { describe, expect, it } from 'vitest'
import { chapters } from './chapters'
import { storyFlows } from './story-flows'
import { storyArtworkStage, validateStoryFlow } from './story-engine'

describe('story flow data', () => {
  it('contains three valid branching choice points in every chapter', () => {
    for (const flow of Object.values(storyFlows)) {
      const validation = validateStoryFlow(flow)
      expect(validation.errors).toEqual([])
      expect(validation.valid).toBe(true)
      expect(validation.choiceCount).toBe(3)
    }
  })

  it('uses stable unique ids and merges every option after one response', () => {
    for (const flow of Object.values(storyFlows)) {
      expect(new Set(Object.keys(flow.nodes)).size).toBe(Object.keys(flow.nodes).length)
      for (const node of Object.values(flow.nodes)) {
        expect(node.id).toBeTruthy()
        if (node.type !== 'choice') continue
        const mergeTargets = node.options.map((option) => {
          const response = flow.nodes[option.next]
          expect(response?.type).toBe('dialogue')
          return response?.type === 'dialogue' ? response.next : ''
        })
        expect(new Set(mergeTargets).size).toBe(1)
        expect(node.options.every((option) => option.englishText && option.japaneseText)).toBe(true)
        expect(node.learningCue.explanationEn).toBeTruthy()
        expect(node.learningCue.explanationJa).toBeTruthy()
      }
    }
  })

  it('provides longer regular dialogue sequences around the choice points', () => {
    for (const flow of Object.values(storyFlows)) {
      for (let segment = 1; segment <= 3; segment += 1) {
        expect(flow.nodes[`c${flow.chapterId}-s${segment}-d1`]?.type).toBe('dialogue')
        expect(flow.nodes[`c${flow.chapterId}-s${segment}-d2`]?.type).toBe('dialogue')
      }
      expect(flow.nodes[`c${flow.chapterId}-closing-1`]?.type).toBe('dialogue')
      expect(flow.nodes[`c${flow.chapterId}-closing-2`]?.type).toBe('dialogue')
    }
  })

  it('maps story progression to opening, middle, and late artwork states', () => {
    expect(storyArtworkStage('c1-s1-d1')).toBe('opening')
    expect(storyArtworkStage('c1-s1-warm-response')).toBe('opening')
    expect(storyArtworkStage('c2-s2-choice')).toBe('middle')
    expect(storyArtworkStage('c2-s2-curry-response')).toBe('middle')
    expect(storyArtworkStage('c3-s3-choice')).toBe('late')
    expect(storyArtworkStage('c3-closing-1')).toBe('late')
  })

  it('keeps layered conversation artwork separate from chapter card images', () => {
    for (const chapter of chapters) {
      const artwork = Object.values(chapter.storyArtwork)
      expect(new Set(artwork).size).toBe(4)
      expect(artwork).not.toContain(chapter.image)
      expect(chapter.storyArtwork.background).toContain('-background.png')
      expect(chapter.storyArtwork.early).toContain('-pose-early.png')
      expect(chapter.storyArtwork.middle).toContain('-pose-middle.png')
      expect(chapter.storyArtwork.late).toContain('-pose-late.png')
    }
  })
})
