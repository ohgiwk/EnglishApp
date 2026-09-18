import type { VocabularyQuestion, VocabularyWord } from '../types'

export function vocabularyPresentation(question: VocabularyQuestion, word: VocabularyWord) {
  const sentenceExercise = question.type === 'fill-blank' || question.type === 'reorder'
  const sentence =
    question.type === 'fill-blank'
      ? question.sentence
      : question.type === 'reorder'
        ? question.prompt
        : word.example
  const translation = sentenceExercise ? question.promptJa : word.exampleJa
  const correctAnswer =
    question.type === 'fill-blank'
      ? question.answer
      : question.type === 'reorder'
        ? question.prompt
        : question.type === 'en-to-ja'
          ? word.meaningJa
          : word.word
  const labels = {
    'en-to-ja': ['QUICK CHOICE', 'いちばん近い意味は？'],
    'ja-to-en': ['QUICK CHOICE', 'この意味に合う英単語は？'],
    flashcard: ['FLASH CARD', 'この単語、覚えている？'],
    'fill-blank': ['FILL IN THE BLANK', '空欄に入る英単語を入力してね'],
    reorder: ['WORD ORDER', '単語を正しい順番に並べよう']
  } as const
  return {
    sentence,
    translation,
    correctAnswer,
    sentenceExercise,
    label: labels[question.type][0],
    instruction: labels[question.type][1],
    prompt: question.type === 'ja-to-en' ? word.meaningJa : word.word,
    questionSpeech: sentenceExercise ? null : word.word,
    answerSpeech: sentenceExercise ? sentence : null
  }
}
