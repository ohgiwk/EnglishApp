import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { migrateSave, useAppStore } from './app'
import { chapters } from '../data/chapters'
import { getStoryFlow } from '../data/story-flows'
import type { VocabularySession } from '../types'

const data = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
  removeItem: (key: string) => data.delete(key),
  clear: () => data.clear()
})

describe('app store progression', () => {
  beforeEach(() => {
    data.clear()
    setActivePinia(createPinia())
  })

  it('applies chapter rewards only once', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    const first = { affection: store.progress.affection, xp: store.s.xp, days: store.s.studyDays }
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    expect({
      affection: store.progress.affection,
      xp: store.s.xp,
      days: store.s.studyDays
    }).toEqual(first)
    expect(store.currentChapter).toBe(2)
  })

  it('persists a three-choice story session and awards its totals only once', () => {
    const store = useAppStore()
    const initial = {
      affection: store.progress.affection,
      trust: store.progress.trust,
      xp: store.s.xp
    }
    expect(store.startStorySession(1)).toBe(true)
    const flow = getStoryFlow(1)
    while (store.s.activeStorySession) {
      const node = flow.nodes[store.s.activeStorySession.currentNodeId]
      if (node.type === 'dialogue') {
        store.advanceStoryNode()
      } else if (node.type === 'choice') {
        expect(store.chooseStoryOption(node.id, node.options[0].id)).toBe(true)
        expect(store.acknowledgeStoryChoice(node.id)).toBe(true)
      } else {
        break
      }
    }
    const firstResult = store.completeStorySession()!
    expect(firstResult.storyChoices).toHaveLength(3)
    expect(firstResult.totalAffectionChange).toBe(6)
    expect(firstResult.totalTrustChange).toBe(6)
    expect(store.progress.affection).toBe(initial.affection + 6)
    expect(store.progress.trust).toBe(initial.trust + 6)
    expect(store.s.xp).toBe(initial.xp + 24)
    expect(store.s.activeStorySession).toBeNull()

    const earned = {
      affection: store.progress.affection,
      trust: store.progress.trust,
      xp: store.s.xp
    }
    expect(store.startStorySession(1)).toBe(true)
    expect(store.s.activeStorySession?.reviewOnly).toBe(true)
    while (store.s.activeStorySession) {
      const node = flow.nodes[store.s.activeStorySession.currentNodeId]
      if (node.type === 'dialogue') {
        store.advanceStoryNode()
      } else if (node.type === 'choice') {
        expect(store.chooseStoryOption(node.id, node.options[1].id)).toBe(false)
        expect(store.continueReviewedStoryChoice()).toBe(true)
      } else {
        break
      }
    }
    expect(store.completeStorySession()).toEqual(firstResult)
    expect({
      affection: store.progress.affection,
      trust: store.progress.trust,
      xp: store.s.xp
    }).toEqual(earned)
  })

  it('restores an active story node and selected branch after reload', () => {
    const store = useAppStore()
    const flow = getStoryFlow(1)
    store.startStorySession(1)
    let choiceNode = flow.nodes[store.s.activeStorySession!.currentNodeId]
    while (choiceNode.type === 'dialogue') {
      store.advanceStoryNode()
      choiceNode = flow.nodes[store.s.activeStorySession!.currentNodeId]
    }
    expect(choiceNode.type).toBe('choice')
    if (choiceNode.type !== 'choice') return
    store.chooseStoryOption(choiceNode.id, choiceNode.options[1].id)
    const snapshot = JSON.parse(JSON.stringify(store.s.activeStorySession))

    setActivePinia(createPinia())
    const restored = useAppStore()
    expect(restored.s.activeStorySession).toEqual(snapshot)
  })

  it('opens any chapter from Story, replacing an unfinished session', () => {
    const store = useAppStore()
    expect(store.currentChapter).toBe(1)
    expect(store.startStorySession(1)).toBe(true)
    store.advanceStoryNode()

    expect(store.startStorySession(2)).toBe(true)
    expect(store.s.activeStorySession?.chapterId).toBe(2)
    expect(store.s.activeStorySession?.currentNodeId).toBe(getStoryFlow(2).startNodeId)
  })

  it('drops revision-mismatched active story state without changing historical progress', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    const migrated = migrateSave({
      ...store.s,
      activeStorySession: {
        characterId: 'emma',
        chapterId: 1,
        contentRevision: 999,
        currentNodeId: 'missing',
        history: [],
        selections: [],
        acknowledgedChoiceIds: [],
        reviewOnly: false,
        startedAt: new Date().toISOString()
      }
    })
    expect(migrated.activeStorySession).toBeNull()
    expect(migrated.characterProgress.emma.affection).toBe(store.progress.affection)
    expect(migrated.characterProgress.emma.trust).toBe(store.progress.trust)
    expect(migrated.characterProgress.emma.answers[1].choice.id).toBe(choice.id)
  })

  it('adds and removes a review expression', () => {
    const store = useAppStore()
    store.toggleReview('c1-a')
    expect(store.progress.reviews).toContain('c1-a')
    store.toggleReview('c1-a')
    expect(store.progress.reviews).not.toContain('c1-a')
  })

  it('migrates legacy saves into Emma progress without losing shared learning data', () => {
    const migrated = migrateSave({
      version: 2,
      name: 'Keiya',
      onboarded: true,
      affection: 33,
      trust: 24,
      completed: [1, 2],
      reviews: ['c1-a'],
      answers: {},
      xp: 80,
      wordProgress: {
        v0001: {
          status: 'learning',
          correctSessions: ['one'],
          correctCount: 1,
          incorrectCount: 0,
          lastStudiedAt: '2026-01-01'
        }
      }
    })
    expect(migrated.version).toBe(5)
    expect(migrated.name).toBe('Keiya')
    expect(migrated.activeCharacterId).toBe('emma')
    expect(migrated.characterSelectionCompleted).toBe(true)
    expect(migrated.characterProgress.emma.affection).toBe(33)
    expect(migrated.characterProgress.emma.completed).toEqual([1, 2])
    expect(migrated.characterProgress.emma.reviews).toEqual(['c1-a'])
    expect(migrated.xp).toBe(80)
    expect(migrated.wordProgress.v0001.status).toBe('learning')
    expect(migrated.unlockedVocabularyLevel).toBe(1)
    expect(migrated.lifetimeStudyStats.storySessions).toBe(2)
  })

  it('allows only published characters to become active', () => {
    const store = useAppStore()
    expect(store.selectCharacter('secret-1')).toBe(false)
    expect(store.s.activeCharacterId).toBe('emma')
    expect(store.s.characterSelectionCompleted).toBe(false)
    expect(store.selectCharacter('emma')).toBe(true)
    expect(store.s.characterSelectionCompleted).toBe(true)
    expect(store.s.onboarded).toBe(true)
  })

  it('keeps progress records independent for all character slots', () => {
    const store = useAppStore()
    store.s.characterProgress['secret-1'].affection = 72
    store.s.characterProgress['secret-1'].completed.push(1)
    expect(store.s.characterProgress.emma.affection).toBe(18)
    expect(store.s.characterProgress.emma.completed).toEqual([])
  })

  it('repairs unavailable and unknown active character IDs during migration', () => {
    const unavailable = migrateSave({
      version: 3,
      activeCharacterId: 'secret-2',
      characterSelectionCompleted: true,
      characterProgress: {
        emma: { affection: 18, trust: 12, completed: [], answers: {}, reviews: [] },
        'secret-1': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] },
        'secret-2': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] }
      }
    })
    expect(unavailable.activeCharacterId).toBe('emma')
  })

  it('backfills v3 lifetime and daily stats without assigning story dates', () => {
    const migrated = migrateSave({
      version: 3,
      activeCharacterId: 'emma',
      characterSelectionCompleted: true,
      characterProgress: {
        emma: { affection: 20, trust: 14, completed: [1, 2], answers: {}, reviews: [] },
        'secret-1': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] },
        'secret-2': { affection: 0, trust: 0, completed: [], answers: {}, reviews: [] }
      },
      vocabularyResults: [
        {
          sessionId: 'legacy-session',
          level: 1,
          correctCount: 8,
          totalCount: 10,
          accuracy: 80,
          earnedXp: 30,
          affectionChange: 3,
          trustChange: 2,
          masteredWordIds: [],
          reviewWordIds: [],
          completedAt: '2026-07-20T10:00:00.000Z'
        }
      ]
    })
    expect(migrated.lifetimeStudyStats).toEqual({
      storySessions: 2,
      vocabularySessions: 1,
      questionsAnswered: 10,
      correctAnswers: 8
    })
    expect(migrated.dailyStudyStats['2026-07-20']).toMatchObject({
      xpEarned: 30,
      storySessions: 0,
      vocabularySessions: 1,
      questionsAnswered: 10,
      correctAnswers: 8
    })
  })

  it('keeps only the newest 365 daily records in v4 saves', () => {
    const dailyStudyStats = Object.fromEntries(
      Array.from({ length: 370 }, (_, index) => {
        const date = new Date(2025, 0, 1 + index).toLocaleDateString('sv-SE')
        return [
          date,
          {
            date,
            xpEarned: 1,
            storySessions: 0,
            vocabularySessions: 1,
            questionsAnswered: 1,
            correctAnswers: 1
          }
        ]
      })
    )
    const migrated = migrateSave({
      version: 4,
      dailyStudyStats,
      lifetimeStudyStats: {
        storySessions: 0,
        vocabularySessions: 370,
        questionsAnswered: 370,
        correctAnswers: 370
      }
    })
    expect(Object.keys(migrated.dailyStudyStats)).toHaveLength(365)
    expect(Object.keys(migrated.dailyStudyStats)).not.toContain('2025-01-01')
  })

  it('discards old active sessions so interrupted work cannot resume', () => {
    const migrated = migrateSave({
      version: 4,
      activeVocabularySession: {
        id: 'legacy-active',
        level: 1,
        questions: [{ wordId: 'v0001', type: 'flashcard', options: [] }],
        answers: [],
        currentIndex: 0,
        startedAt: '2026-07-24T10:00:00.000Z'
      }
    })
    expect(migrated.lastSelectedVocabularyMode).toBe('mixed')
    expect(migrated.activeVocabularySession).toBeNull()
  })

  it('persists the selected mode and starts ten questions in that mode', () => {
    const store = useAppStore()
    store.setVocabularyMode('fill-blank')
    store.startVocabularySession(1)
    expect(store.s.lastSelectedVocabularyMode).toBe('fill-blank')
    expect(store.s.activeVocabularySession?.mode).toBe('fill-blank')
    expect(store.s.activeVocabularySession?.questions).toHaveLength(10)
    expect(
      store.s.activeVocabularySession?.questions.every((question) => question.type === 'fill-blank')
    ).toBe(true)
    expect(JSON.parse(data.get('love-language-save-v1') ?? '{}').lastSelectedVocabularyMode).toBe(
      'fill-blank'
    )
  })

  it('discards an interrupted session while preserving the selected mode', () => {
    const store = useAppStore()
    store.startVocabularySession(1, 'reorder')
    expect(store.s.activeVocabularySession).not.toBeNull()
    store.cancelVocabularySession()
    expect(store.s.activeVocabularySession).toBeNull()
    expect(store.s.lastSelectedVocabularyMode).toBe('reorder')
    const saved = JSON.parse(data.get('love-language-save-v1') ?? '{}')
    expect(saved.activeVocabularySession).toBeNull()
    expect(saved.lastSelectedVocabularyMode).toBe('reorder')
  })

  it('masters a word after correct answers in two different sessions', () => {
    const store = useAppStore()
    const session = (id: string): VocabularySession => ({
      id,
      level: 1,
      mode: 'mixed',
      questions: [{ wordId: 'v0001', type: 'flashcard', options: [] }],
      answers: [],
      currentIndex: 0,
      startedAt: new Date().toISOString()
    })
    store.s.activeVocabularySession = session('session-one')
    store.answerVocabularyQuestion(true)
    expect(store.s.wordProgress.v0001.status).toBe('learning')
    store.s.activeVocabularySession = session('session-two')
    store.answerVocabularyQuestion(true)
    expect(store.s.wordProgress.v0001.status).toBe('mastered')
  })

  it('caps relationship rewards after three vocabulary sessions while keeping XP', () => {
    const store = useAppStore()
    const initialAffection = store.emmaProgress.affection
    const session = (id: string): VocabularySession => ({
      id,
      level: 1,
      mode: 'mixed',
      questions: [{ wordId: `v000${id}`, type: 'flashcard', options: [] }],
      answers: [],
      currentIndex: 0,
      startedAt: new Date().toISOString()
    })
    for (const id of ['1', '2', '3', '4']) {
      store.s.activeVocabularySession = session(id)
      store.answerVocabularyQuestion(true)
    }
    expect(store.emmaProgress.affection).toBe(initialAffection + 9)
    expect(store.s.xp).toBe(120)
    expect(store.s.lastVocabularyResult?.affectionChange).toBe(0)
    expect(store.s.lifetimeStudyStats.vocabularySessions).toBe(4)
    expect(store.s.lifetimeStudyStats.questionsAnswered).toBe(4)
    expect(store.lifetimeAccuracy).toBe(100)
    const date = new Date().toLocaleDateString('sv-SE')
    expect(store.s.dailyStudyStats[date].vocabularySessions).toBe(4)
  })

  it('records a story session only for the first chapter completion', () => {
    const store = useAppStore()
    const choice = chapters[0].scene.choices![0]
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    store.complete({ characterId: 'emma', chapterId: 1, choice })
    expect(store.s.lifetimeStudyStats.storySessions).toBe(1)
    const date = new Date().toLocaleDateString('sv-SE')
    expect(store.s.dailyStudyStats[date].storySessions).toBe(1)
    expect(store.s.dailyStudyStats[date].xpEarned).toBe(choice.englishXp)
  })
})
