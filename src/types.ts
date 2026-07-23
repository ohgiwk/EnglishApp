export type HeroineExpression = 'normal'|'smile'|'blush'|'confused'
export type RelationshipStatus = '知り合い'|'友達'|'気になる存在'|'特別な存在'
export interface Player { name:string; englishXp:number; studyDays:number }
export interface Heroine { name:string; age:number; origin:string; major:string; hobbies:string[] }
export interface Dialogue { speaker:'Emma'|'Player'; english:string; japanese:string; expression?:HeroineExpression }
export interface Choice { id:string; englishText:string; japaneseText:string; affectionChange:number; trustChange:number; englishXp:number; feedback:string; naturalExpression:string; explanation:string; heroineResponse:string; heroineResponseJa:string; heroineExpression:HeroineExpression }
export interface Scene { id:string; dialogues:Dialogue[]; choices?:Choice[]; closing:Dialogue[] }
export interface LearningExpression { english:string; japanese:string }
export interface Chapter { id:number; title:string; subtitle:string; theme:string; color:string; icon:string; image:string; scene:Scene; expressions:LearningExpression[]; words:string[] }
export interface ChoiceResult { chapterId:number; choice:Choice }
export interface Memory { chapterId:number; title:string; description:string; expression:string }
export interface StudyRecord { completedChapters:number[]; reviewIds:string[]; learnedExpressions:number }
export interface AppSettings { showTranslation:boolean }

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
