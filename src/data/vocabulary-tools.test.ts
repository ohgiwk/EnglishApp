/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import catalog from './vocabulary-catalog'

const dirs: string[] = []
const fixture = (name: string, content: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'englishapp-vocabulary-'))
  dirs.push(dir)
  const path = join(dir, name)
  writeFileSync(path, content)
  return path
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const run = (script: string, ...args: string[]) =>
  execFileSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  })

describe('vocabulary editorial tools', () => {
  it('rejects duplicate headwords and mismatched editorial levels before publication', () => {
    const words = catalog
    const first = words[0]
    const duplicate = fixture(
      'duplicate.json',
      JSON.stringify([first, { ...first, id: 'v9999', word: first.word.toUpperCase() }])
    )
    expect(() => run('scripts/validate-vocabulary.mjs', duplicate)).toThrow('duplicate headword')
    const mismatch = fixture('mismatch.json', JSON.stringify([{ ...first, level: 6 }]))
    expect(() => run('scripts/validate-vocabulary.mjs', mismatch)).toThrow(
      'editorial level mismatch'
    )
  })

  it('requires authored examples for reviewed entries', () => {
    const words = catalog
    const invalid = {
      ...words[0],
      exampleInfo: undefined,
      editorial: {
        ...words[0].editorial,
        reviewStatus: 'reviewed',
        references: ['editorial-policy-v1']
      }
    }
    const path = fixture('reviewed.json', JSON.stringify([invalid]))
    expect(() => run('scripts/validate-vocabulary.mjs', path)).toThrow(
      'reviewed entry needs an authored example'
    )
  })

  it('records a custom extraction scope for manually transcribed passages', () => {
    const path = fixture('passage.txt', 'Teacher teacher')
    const description = 'Manual transcription; PDF page 2 body only; excludes notes and options'
    const report = JSON.parse(
      run(
        'scripts/vocabulary-coverage.mjs',
        path,
        '2025',
        'passage',
        'https://example.invalid/exam.pdf',
        description
      )
    )
    expect(report.extraction).toBe(description)
    expect(report.totalTokens).toBe(2)
    expect(report.matchedTokens).toBe(2)
  })

  it('reports surface forms without pretending to recognize inflections or contractions', () => {
    const path = fixture('exam.txt', 'Teacher teacher I a children has isn’t child-friendly /c033')
    const report = JSON.parse(
      run(
        'scripts/vocabulary-coverage.mjs',
        path,
        '2025',
        'test fixture',
        'https://example.invalid/exam.pdf'
      )
    )
    expect(report.totalTokens).toBe(9)
    expect(report.uniqueTypes).toBe(8)
    expect(report.matchedTokens).toBe(6)
    expect(report.missingTop20.map((entry: { word: string }) => entry.word).sort()).toEqual([
      'children',
      'has',
      "isn't"
    ])
    expect(report.year).toBe(2025)
    expect(report.question).toBe('test fixture')
    expect(report.textSha256).toMatch(/^[a-f0-9]{64}$/)
  })
})

it('loads exactly the same catalog for Vite and Node tools', () => {
  const path = fixture('node-catalog.json', '')
  run(
    '--input-type=module',
    '-e',
    "import { writeFileSync } from 'node:fs'; import { readVocabularyCatalog } from './scripts/read-vocabulary-catalog.mjs'; writeFileSync(process.argv[1], JSON.stringify(readVocabularyCatalog()))",
    path
  )
  const fromNode = JSON.parse(readFileSync(path, 'utf8'))
  expect(fromNode).toEqual(catalog)
})

it('rejects a word stored in the wrong ID-range file', () => {
  const path = fixture('v0101-v0200.json', JSON.stringify([catalog[0]]))
  expect(() => run('scripts/validate-vocabulary.mjs', join(path, '..'))).toThrow(
    'outside the ID range'
  )
})

it('keeps future unreviewed examples out of sentence exercises', () => {
  const word = {
    ...catalog[0],
    editorial: { ...catalog[0].editorial!, reviewStatus: 'needs-review' },
    exampleInfo: {
      source: 'generated',
      reviewStatus: 'needs-review',
      allowedExercises: ['en-to-ja', 'ja-to-en', 'flashcard']
    }
  }
  const validPath = fixture('pending.json', JSON.stringify([word]))
  expect(run('scripts/validate-vocabulary.mjs', validPath)).toContain('Validated 1 words')
  expect(word.exampleInfo?.reviewStatus).toBe('needs-review')
  expect(word.exampleInfo?.allowedExercises).toEqual(['en-to-ja', 'ja-to-en', 'flashcard'])
  const invalid = {
    ...word,
    exampleInfo: {
      ...word.exampleInfo,
      allowedExercises: ['en-to-ja', 'ja-to-en', 'flashcard', 'fill-blank', 'reorder']
    }
  }
  const path = fixture('unreviewed.json', JSON.stringify([invalid]))
  expect(() => run('scripts/validate-vocabulary.mjs', path)).toThrow('invalid exercises')
})
