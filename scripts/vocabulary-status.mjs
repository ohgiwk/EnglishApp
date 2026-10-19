/**
 * 用途: 現在の語数・レベル別件数・未確認件数・次のID範囲と格納先をJSONで表示する。
 * タイミング: 語彙作業の再開時、または追加後に現在位置を確認するとき。
 * 使い分け: 再開メモと合わせて最初に実行する軽量な状況確認。品質検証にはvalidate-vocabularyを使う。
 * 実行（プロジェクト直下）: node scripts/vocabulary-status.mjs
 * データを書き換えず、IDも予約しない。nextBatchは50語追加する場合の候補範囲。
 */
import { readVocabularyCatalog } from './read-vocabulary-catalog.mjs'

const words = readVocabularyCatalog()
const last = Number(words.at(-1).id.slice(1))
const id = (number) => `v${String(number).padStart(4, '0')}`
const start = Math.floor(last / 100) * 100 + 1
console.log(
  JSON.stringify({
    words: words.length,
    levels: Array.from({ length: 6 }, (_, i) => words.filter((w) => w.level === i + 1).length),
    pendingEditorial: words.filter((w) => w.editorial?.reviewStatus !== 'reviewed').length,
    lastId: id(last),
    nextBatch: `${id(last + 1)}–${id(last + 50)}`,
    nextFile: `src/data/vocabulary/${id(start)}-${id(start + 99)}.json`
  })
)
