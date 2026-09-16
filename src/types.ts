export type HeroineExpression = 'normal' | 'smile' | 'blush' | 'confused'
export type RelationshipStatus = '知り合い' | '友達' | '気になる存在' | '特別な存在'
export type CharacterId = 'emma' | 'secret-1' | 'secret-2'
export type CharacterAvailability = 'available' | 'secret'
export interface Player {
  name: string
  englishXp: number
  studyDays: number
}
export interface Heroine {
  name: string
  age: number
  origin: string
  major: string
  hobbies: string[]
}
export interface CharacterDefinition {
  id: CharacterId
  availability: CharacterAvailability
  name: string
  englishName: string
  age?: number
  origin?: string
  major?: string
  languages?: string[]
  personality?: string[]
  learningThemes?: string[]
  hobbies: string[]
  description: string
  image?: string
  accent: string
}
export interface CharacterProgress {
  affection: number
  trust: number
  completed: number[]
  answers: Record<number, ChoiceResult>
  reviews: string[]
}
export interface StoryLearningCue {
  id: string
  title: string
  construction: string
  explanationEn: string
  explanationJa: string
}
export interface Dialogue {
  speaker: 'Emma' | 'Player'
  english: string
  japanese: string
  expression?: HeroineExpression
}
export interface StoryDialogueNode {
  id: string
  type: 'dialogue'
  dialogue: Dialogue
  next: string
}
export interface StoryChoiceOption {
  id: string
  englishText: string
  japaneseText: string
  naturalExpression: string
  feedback: string
  affectionChange: number
  trustChange: number
  englishXp: number
  next: string
}
export interface StoryChoiceNode {
  id: string
  type: 'choice'
  promptEnglish: string
  promptJapanese: string
  learningCue: StoryLearningCue
  options: StoryChoiceOption[]
}
export interface StoryEndingNode {
  id: string
  type: 'ending'
}
export type StoryNode = StoryDialogueNode | StoryChoiceNode | StoryEndingNode
export interface StoryFlow {
  chapterId: number
  revision: number
  startNodeId: string
  nodes: Record<string, StoryNode>
}
export interface StorySelection {
  pointId: string
  optionId: string
}
export interface ActiveStorySession {
  characterId: CharacterId
  chapterId: number
  contentRevision: number
  currentNodeId: string
  history: string[]
  selections: StorySelection[]
  acknowledgedChoiceIds: string[]
  reviewOnly: boolean
  startedAt: string
}
export interface Choice {
  id: string
  englishText: string
  japaneseText: string
  affectionChange: number
  trustChange: number
  englishXp: number
  feedback: string
  naturalExpression: string
  explanation: string
  heroineResponse: string
  heroineResponseJa: string
  heroineExpression: HeroineExpression
}
export interface Scene {
  id: string
  dialogues: Dialogue[]
  choices?: Choice[]
  closing: Dialogue[]
}
export interface LearningExpression {
  english: string
  japanese: string
}
export interface Chapter {
  id: number
  title: string
  subtitle: string
  theme: string
  color: string
  icon: string
  image: string
  storyArtwork: {
    background: string
    early: string
    middle: string
    late: string
  }
  scene: Scene
  expressions: LearningExpression[]
  words: string[]
}
export interface ChoiceResult {
  characterId: CharacterId
  chapterId: number
  choice: Choice
  storyChoices?: StoryChoiceResult[]
  totalAffectionChange?: number
  totalTrustChange?: number
  totalEnglishXp?: number
  contentRevision?: number
  completedAt?: string
  legacy?: boolean
}
export interface StoryChoiceResult {
  pointId: string
  optionId: string
  englishText: string
  japaneseText: string
  naturalExpression: string
  feedback: string
  affectionChange: number
  trustChange: number
  englishXp: number
  learningCue: StoryLearningCue
}
export interface Memory {
  chapterId: number
  title: string
  description: string
  expression: string
}
export interface StudyRecord {
  completedChapters: number[]
  reviewIds: string[]
  learnedExpressions: number
}
export interface AppSettings {
  showTranslation: boolean
}
export interface DailyStudyStats {
  date: string
  xpEarned: number
  storySessions: number
  vocabularySessions: number
  questionsAnswered: number
  correctAnswers: number
}
export interface LifetimeStudyStats {
  storySessions: number
  vocabularySessions: number
  questionsAnswered: number
  correctAnswers: number
}

export type VocabularyStatus = 'new' | 'learning' | 'mastered'
export type VocabularyQuestionType =
  'en-to-ja' | 'ja-to-en' | 'flashcard' | 'fill-blank' | 'reorder'
export type VocabularySessionMode = 'mixed' | VocabularyQuestionType
export type VocabularyQuestionCount = 10 | 20 | 50 | 'all'
export type VocabularyPartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'

export interface VocabularyWord {
  id: string
  word: string
  meaningJa: string
  partOfSpeech: VocabularyPartOfSpeech
  level: number
  example: string
  exampleJa: string
  category: string
}

export interface VocabularyLevel {
  id: number
  title: string
  subtitle: string
  wordCount: number
  color: string
}

export interface WordProgress {
  status: VocabularyStatus
  correctSessions: string[]
  correctCount: number
  incorrectCount: number
  lastStudiedAt: string
}

export interface VocabularyQuestion {
  wordId: string
  type: VocabularyQuestionType
  options: string[]
  prompt?: string
  promptJa?: string
  answer?: string
  tokens?: VocabularyQuestionToken[]
  correctOrder?: string[]
}

export interface VocabularyQuestionToken {
  id: string
  text: string
}

export interface VocabularyAnswer {
  wordId: string
  type: VocabularyQuestionType
  correct: boolean
  answeredAt: string
}

export interface VocabularySession {
  id: string
  level: number
  mode: VocabularySessionMode
  questions: VocabularyQuestion[]
  answers: VocabularyAnswer[]
  currentIndex: number
  startedAt: string
}

export interface VocabularyResult {
  sessionId: string
  level: number
  mode?: VocabularySessionMode
  correctCount: number
  totalCount: number
  accuracy: number
  earnedXp: number
  affectionChange: number
  trustChange: number
  masteredWordIds: string[]
  reviewWordIds: string[]
  answers?: VocabularyAnswer[]
  completedAt: string
}
