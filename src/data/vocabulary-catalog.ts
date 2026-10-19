import type { VocabularyWord } from '../types'

// Each file owns all information for a stable range of 100 word IDs.
// Levels may change without moving a word to another file.
const files = import.meta.glob<VocabularyWord[]>('./vocabulary/v*.json', {
  eager: true,
  import: 'default'
})

const catalog: VocabularyWord[] = Object.values(files)
  .flat()
  .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))

export default catalog
