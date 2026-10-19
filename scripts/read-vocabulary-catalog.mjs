/**
 * 用途: Node用の共通ローダー。通常はsrc/data/vocabulary/のJSONをID順に結合する。
 * タイミング: 検証・件数確認・入試照合など、他のスクリプトから読み込むとき。
 * 使い分け: CLIではなく共通関数。新しい集計スクリプトでもJSONの読み込みを独自実装せず利用する。
 * 使用例: import { readVocabularyCatalog } from './read-vocabulary-catalog.mjs'
 *         const words = readVocabularyCatalog() // 任意でファイル/ディレクトリのパスを渡す
 * ディレクトリ入力ではファイル名・ID範囲も検査する。単一JSONはそのまま解析する。
 * 語義やレコード全体の検証は行わない。直接nodeで実行しても集計・出力はしない。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const defaultDirectory = fileURLToPath(new URL('../src/data/vocabulary', import.meta.url))

export function readVocabularyCatalog(input = defaultDirectory) {
  // A single file remains useful for validating a proposed batch or test fixture.
  if (statSync(input).isFile()) return JSON.parse(readFileSync(input, 'utf8'))
  const names = readdirSync(input).filter((name) => name.endsWith('.json'))
  if (!names.length) throw new Error('No vocabulary files found')
  const words = names.flatMap((name) => {
    const range = /^v(\d{4,})-v(\d{4,})\.json$/.exec(name)
    if (!range) throw new Error(`Invalid vocabulary filename: ${name}`)
    const start = Number(range[1])
    const end = Number(range[2])
    if (start < 1 || (start - 1) % 100 !== 0 || end !== start + 99) {
      throw new Error(`Invalid ID range: ${name}`)
    }
    const batch = JSON.parse(readFileSync(join(input, name), 'utf8'))
    if (!Array.isArray(batch) || !batch.length || batch.length > 100) {
      throw new Error(`Expected 1–100 words in ${name}`)
    }
    for (const word of batch) {
      const id = /^v(\d{4,})$/.exec(word.id ?? '')
      if (!id || Number(id[1]) < start || Number(id[1]) > end) {
        throw new Error(`Word ${word.id} is outside the ID range of ${name}`)
      }
    }
    return batch
  })
  return words.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
}
