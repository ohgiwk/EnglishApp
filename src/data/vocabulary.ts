import type { VocabularyLevel, VocabularyWord } from '../types'
import catalog from './vocabulary-catalog'
// Both reviewed and pending examples are stored with their word; no runtime overrides.
export const vocabularyWords: VocabularyWord[] = catalog

export const vocabularyLevels: VocabularyLevel[] = [
  {
    id: 1,
    title: 'First Steps',
    subtitle: '小学校〜中学基礎',
    targetWordCount: 1000,
    color: '#f5a7ba'
  },
  {
    id: 2,
    title: 'Everyday Words',
    subtitle: '中学標準〜高校入門',
    targetWordCount: 1200,
    color: '#f4bd8f'
  },
  {
    id: 3,
    title: 'High School Basics',
    subtitle: '高校基礎・入試準備',
    targetWordCount: 1000,
    color: '#8fd0bd'
  },
  {
    id: 4,
    title: 'Exam Essentials',
    subtitle: '共通テスト・標準入試',
    targetWordCount: 800,
    color: '#8bbdd9'
  },
  {
    id: 5,
    title: 'Advanced Reading',
    subtitle: '国公立二次・難関私大',
    targetWordCount: 600,
    color: '#a6a0df'
  },
  {
    id: 6,
    title: 'Further Reading',
    subtitle: '難関大の発展読解',
    targetWordCount: 400,
    color: '#cf9dcc'
  }
].map((level) => ({
  ...level,
  wordCount: vocabularyWords.filter((word) => word.level === level.id).length
}))

export const vocabularyReviewPending = vocabularyWords.some(
  (word) => word.editorial?.reviewStatus === 'needs-review'
)

export const vocabularyExpansionPending = vocabularyLevels.some(
  (level) => level.wordCount < level.targetWordCount
)
