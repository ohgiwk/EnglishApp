export type HeroineExpression = 'normal'|'smile'|'blush'|'confused'
export type RelationshipStatus = '知り合い'|'友達'|'気になる存在'|'特別な存在'
export type CharacterId = 'emma' | 'secret-1' | 'secret-2'
export type CharacterAvailability = 'available' | 'secret'
export interface Player { name:string; englishXp:number; studyDays:number }
export interface Heroine { name:string; age:number; origin:string; major:string; hobbies:string[] }
export interface CharacterDefinition {
  id: CharacterId
  availability: CharacterAvailability
  name: string
  englishName: string
  age?: number
  origin?: string
  major?: string
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
export interface Dialogue { speaker:'Emma'|'Player'; english:string; japanese:string; expression?:HeroineExpression }
export interface Choice { id:string; englishText:string; japaneseText:string; affectionChange:number; trustChange:number; englishXp:number; feedback:string; naturalExpression:string; explanation:string; heroineResponse:string; heroineResponseJa:string; heroineExpression:HeroineExpression }
export interface Scene { id:string; dialogues:Dialogue[]; choices?:Choice[]; closing:Dialogue[] }
export interface LearningExpression { english:string; japanese:string }
export interface Chapter { id:number; title:string; subtitle:string; theme:string; color:string; icon:string; image:string; scene:Scene; expressions:LearningExpression[]; words:string[] }
export interface ChoiceResult { characterId:CharacterId; chapterId:number; choice:Choice }
export interface Memory { chapterId:number; title:string; description:string; expression:string }
export interface StudyRecord { completedChapters:number[]; reviewIds:string[]; learnedExpressions:number }
export interface AppSettings { showTranslation:boolean }
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
export type VocabularyQuestionType = 'en-to-ja' | 'ja-to-en' | 'flashcard'
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
  questions: VocabularyQuestion[]
  answers: VocabularyAnswer[]
  currentIndex: number
  startedAt: string
}

export interface VocabularyResult {
  sessionId: string
  level: number
  correctCount: number
  totalCount: number
  accuracy: number
  earnedXp: number
  affectionChange: number
  trustChange: number
  masteredWordIds: string[]
  reviewWordIds: string[]
  completedAt: string
}
