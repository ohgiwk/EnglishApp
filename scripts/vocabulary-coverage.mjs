/**
 * 用途: 抽出済みの入試英文と正式カタログを表層形で照合し、集計JSONを標準出力する。
 * タイミング: 問題の対象範囲と抽出方法を確定した後、初回照合や語彙追加後の再集計を行うとき。
 * 使い分け: 入試問題の照合専用。通常の50語追加ごとに実行する必要はなく、対象問題を再評価するときに使う。
 * 実行（プロジェクト直下）:
 * node scripts/vocabulary-coverage.mjs <英文テキスト> <西暦4桁> <問題名> <HTTPS出典URL> [抽出方法]
 * 空白を含む引数は引用符で囲む。結果を保存する場合は確認後にdocs/vocabulary/exams/へ置く。
 * PDF取得・文字抽出は行わない。出典URLも取得せず、入力テキストとカタログを読むだけ。
 * 抽出方法は実際の対象範囲に合わせて指定する。省略時はpypdfによる公開PDF全体の説明になる。
 * 原形統合・固有名詞除外はしない。一致率を理解度や入試対応の達成率と扱わない。
 * 出力には入力本文とID/見出し語一覧のハッシュを含む（カタログ全フィールドのハッシュではない）。
 */
import { readFileSync } from 'node:fs'
import { readVocabularyCatalog } from './read-vocabulary-catalog.mjs'
import { createHash } from 'node:crypto'

const [textPath, year, question, sourceUrl, extractionDescription] = process.argv.slice(2)
if (!textPath || !/^\d{4}$/.test(year ?? '') || !question || !/^https:\/\//.test(sourceUrl ?? '')) {
  throw new Error(
    'Usage: node scripts/vocabulary-coverage.mjs <extracted-text> <year> <exam-and-question> <https-source-url> [extraction-description]'
  )
}
const words = readVocabularyCatalog()
const raw = readFileSync(textPath, 'utf8')
// pypdf can expose unmapped numbered glyphs such as /c033 for question labels.
const text = raw
  .normalize('NFKC')
  .replace(/\/c\d+/g, ' ')
  .replace(/[’‘‛]/g, "'")
  .toLowerCase()
const tokens = text.match(/[a-z]+(?:'[a-z]+)*/g) ?? []
if (!tokens.length) throw new Error('No English tokens found')
const heads = new Set(words.map((word) => word.word.toLowerCase()))
const counts = new Map()
for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)
const matchedTokens = tokens.filter((token) => heads.has(token)).length
const matchedTypes = [...counts.keys()].filter((token) => heads.has(token)).length
const missing = [...counts]
  .filter(([word]) => !heads.has(word))
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
console.log(
  JSON.stringify(
    {
      year: Number(year),
      question,
      sourceUrl,
      extraction:
        extractionDescription ??
        'pypdf; all published PDF pages; includes instructions, options and figure text; excludes unextractable image text',
      method:
        'NFKC, lowercase, remove /cNNN glyph labels, ASCII words with internal apostrophes; hyphens split; exact surface-form matching; no lemmatization or proper-name exclusion',
      textSha256: createHash('sha256').update(raw).digest('hex'),
      catalogSha256: createHash('sha256')
        .update(JSON.stringify(words.map(({ id, word }) => [id, word])))
        .digest('hex'),
      catalogWords: words.length,
      totalTokens: tokens.length,
      uniqueTypes: counts.size,
      matchedTokens,
      matchedTypes,
      tokenMatchPercent: Number(((100 * matchedTokens) / tokens.length).toFixed(2)),
      typeMatchPercent: Number(((100 * matchedTypes) / counts.size).toFixed(2)),
      missingTop20: missing.slice(0, 20).map(([word, count]) => ({ word, count })),
      limitations:
        'Surface-form matches are not lemma coverage, comprehension or exam readiness. Inflections, contractions, names and PDF extraction artifacts may appear missing. This single public exam cannot establish advanced-university coverage.'
    },
    null,
    2
  )
)
