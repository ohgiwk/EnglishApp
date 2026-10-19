/**
 * 用途: 必須項目、ID・見出し語の重複、品詞・レベル、編集情報、例文の出題条件を検証する。
 * タイミング: 語彙編集後。npm run checkにも含まれるため、通常は別途重複実行しない。
 * 使い分け: 編集途中の部分確認は対象指定、正式データへの統合後はnpm run checkで全体を確認する。
 * 実行（プロジェクト直下）: npm run vocabulary:check
 * 対象指定: node scripts/validate-vocabulary.mjs <JSONファイルまたはディレクトリ>
 * 引数省略時は正式カタログ全体。下書きだけの検証では既存カタログとの重複は検出しない。
 * 成功時は件数を表示し、不正なデータがあれば例外で終了する。データは変更しない。
 * 機械的な整合性検査であり、意味・英文・和訳の正しさや教育的な難易度は別途確認する。
 */
import { readVocabularyCatalog } from './read-vocabulary-catalog.mjs'

const words = readVocabularyCatalog(process.argv[2])
const parts = new Set(['noun', 'verb', 'adjective', 'adverb', 'other'])
const exercises = ['en-to-ja', 'ja-to-en', 'flashcard', 'fill-blank', 'reorder']
const ids = new Set()
const heads = new Set()
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message)
}
requireValue(Array.isArray(words) && words.length > 0, 'Catalog must be a nonempty array')
for (const word of words) {
  const label = `${word.id}: ${word.word}`
  for (const key of ['id', 'word', 'meaningJa', 'example', 'exampleJa', 'category']) {
    requireValue(
      typeof word[key] === 'string' && word[key].trim().length > 0,
      `${label}: missing ${key}`
    )
  }
  requireValue(/^v\d{4,}$/.test(word.id) && !ids.has(word.id), `${label}: invalid or duplicate ID`)
  const head = word.word.toLowerCase()
  requireValue(/^[a-z]+$/.test(head) && !heads.has(head), `${label}: invalid or duplicate headword`)
  ids.add(word.id)
  heads.add(head)
  requireValue(parts.has(word.partOfSpeech), `${label}: invalid part of speech`)
  requireValue(
    Number.isInteger(word.level) && word.level >= 1 && word.level <= 6,
    `${label}: invalid level`
  )
  const edit = word.editorial
  requireValue(edit?.recommendedLevel === word.level, `${label}: editorial level mismatch`)
  requireValue(
    ['reviewed', 'needs-review'].includes(edit.reviewStatus),
    `${label}: invalid review status`
  )
  requireValue(typeof edit.reason === 'string' && edit.reason.trim(), `${label}: missing rationale`)
  requireValue(
    Array.isArray(edit.references) &&
      edit.references.length > 0 &&
      edit.references.every((ref) =>
        [
          'editorial-policy-v1',
          'legacy-frequency-order',
          'cambridge-gay',
          'cambridge-staff',
          'cambridge-host',
          'cambridge-saw',
          'collins-rent'
        ].includes(ref)
      ),
    `${label}: unknown reference`
  )
  if (edit.reviewStatus === 'reviewed') {
    requireValue(
      !edit.references.includes('legacy-frequency-order'),
      `${label}: legacy rank is not an editorial review`
    )
  }
  if (word.exampleInfo) {
    requireValue(
      ['authored', 'core', 'curated', 'generated'].includes(word.exampleInfo.source) &&
        word.exampleInfo.reviewStatus ===
          (word.exampleInfo.source === 'generated' ? 'needs-review' : 'authored'),
      `${label}: invalid example provenance`
    )
    const allowed = word.exampleInfo.source === 'generated' ? exercises.slice(0, 3) : exercises
    requireValue(
      Array.isArray(word.exampleInfo.allowedExercises) &&
        word.exampleInfo.allowedExercises.length === allowed.length &&
        allowed.every((type) => word.exampleInfo.allowedExercises.includes(type)),
      `${label}: invalid exercises`
    )
    requireValue(
      new RegExp(`\\b${head}\\b`, 'i').test(word.example),
      `${label}: target absent from example`
    )
    requireValue(
      !/vocabulary notebook|\bthe word\b/i.test(word.example),
      `${label}: placeholder example`
    )
  }
  if (edit.reviewStatus === 'reviewed')
    requireValue(
      word.exampleInfo?.source === 'authored',
      `${label}: reviewed entry needs an authored example`
    )
  requireValue(word.exampleInfo, `${label}: missing example provenance`)
  if (word.usageNote !== undefined)
    requireValue(
      typeof word.usageNote === 'string' && word.usageNote.trim(),
      `${label}: invalid usage note`
    )
  for (const meaning of word.additionalMeanings ?? []) {
    requireValue(
      parts.has(meaning.partOfSpeech) &&
        ['meaningJa', 'example', 'exampleJa'].every(
          (key) => typeof meaning[key] === 'string' && meaning[key].trim()
        ),
      `${label}: incomplete additional meaning`
    )
    requireValue(
      new RegExp(`\\b${head}\\b`, 'i').test(meaning.example),
      `${label}: target absent from additional example`
    )
  }
}
console.log(
  `Validated ${words.length} words; ${words.filter((word) => word.editorial.reviewStatus === 'needs-review').length} editorial reviews pending.`
)
