export type HeroineExpression = 'normal'|'smile'|'blush'|'confused'
export type RelationshipStatus = '知り合い'|'友達'|'気になる存在'|'特別な存在'
export interface Player { name:string; englishXp:number; studyDays:number }
export interface Heroine { name:string; age:number; origin:string; major:string; hobbies:string[] }
export interface Dialogue { speaker:'Emma'|'Player'; english:string; japanese:string; expression?:HeroineExpression }
export interface Choice { id:string; englishText:string; japaneseText:string; affectionChange:number; trustChange:number; englishXp:number; feedback:string; naturalExpression:string; explanation:string; heroineResponse:string; heroineResponseJa:string; heroineExpression:HeroineExpression }
export interface Scene { id:string; dialogues:Dialogue[]; choices?:Choice[]; closing:Dialogue[] }
export interface LearningExpression { english:string; japanese:string }
export interface Chapter { id:number; title:string; subtitle:string; theme:string; color:string; icon:string; scene:Scene; expressions:LearningExpression[]; words:string[] }
export interface ChoiceResult { chapterId:number; choice:Choice }
export interface Memory { chapterId:number; title:string; description:string; expression:string }
export interface StudyRecord { completedChapters:number[]; reviewIds:string[]; learnedExpressions:number }
export interface AppSettings { showTranslation:boolean }
