export type VocabularyCommentState = 'waiting' | 'correct' | 'incorrect'

export interface VocabularyComment {
  english: string
  japanese: string
}

const comments: Record<VocabularyCommentState, VocabularyComment[]> = {
  waiting: [
    { english: 'Take your time. I’m right here.', japanese: 'ゆっくりで大丈夫。そばにいるよ。' },
    { english: 'Let’s work it out together.', japanese: '一緒に考えてみよう。' },
    { english: 'No rush. Think it through.', japanese: '急がなくて大丈夫。落ち着いて考えてね。' },
    { english: 'You’ve got this. I believe in you.', japanese: 'きっとできるよ。応援してるね。' }
  ],
  correct: [
    { english: 'Great! You remembered it ♡', japanese: 'すごい、覚えてたね！' },
    { english: 'That’s right! Nicely done.', japanese: '正解！よくできました。' },
    {
      english: 'Perfect! You’re getting stronger.',
      japanese: 'ばっちり！どんどん身についてるね。'
    },
    { english: 'You did it! I knew you could.', japanese: 'やったね！できると思ってたよ。' }
  ],
  incorrect: [
    {
      english: 'Almost! Let’s remember it together.',
      japanese: '惜しい！一緒に覚えよう。'
    },
    {
      english: 'Good try! This one will stick next time.',
      japanese: 'いい挑戦だったよ。次はきっと覚えられるね。'
    },
    {
      english: 'No worries. Mistakes help us learn.',
      japanese: '大丈夫。間違いも学びの一歩だよ。'
    },
    { english: 'Let’s check it once more together.', japanese: 'もう一度、一緒に確認しよう。' }
  ]
}

const stableIndex = (key: string, size: number) => {
  let hash = 0
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return hash % size
}

export function vocabularyCommentFor(
  questionKey: string,
  state: VocabularyCommentState
): VocabularyComment {
  const pool = comments[state]
  return pool[stableIndex(`${questionKey}:${state}`, pool.length)]
}
