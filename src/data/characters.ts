import type { CharacterDefinition, CharacterId } from '../types'

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`

export const characters: CharacterDefinition[] = [
  {
    id: 'emma',
    availability: 'available',
    name: 'エマ・スターリング',
    englishName: 'Emma Sterling',
    age: 18,
    origin: '🇺🇸 アメリカ×日本（ハーフ）',
    languages: ['英語：ネイティブ', '日本語：上級'],
    personality: ['明るい', '世話焼き', '少し天然'],
    hobbies: ['映画', 'カフェ巡り', '写真'],
    learningThemes: ['日常英会話', '恋愛表現', 'スラング'],
    description: '明るく世話焼きで、少し天然。日常英会話から恋愛表現まで楽しく教えてくれる。',
    image: asset('emma.png'),
    accent: '#ef7599'
  },
  {
    id: 'secret-1',
    availability: 'secret',
    name: 'SECRET',
    englishName: 'Coming Soon',
    hobbies: [],
    description: 'このキャラクターはまだ公開されていません。',
    accent: '#8b82dc'
  },
  {
    id: 'secret-2',
    availability: 'secret',
    name: 'SECRET',
    englishName: 'Coming Soon',
    hobbies: [],
    description: 'このキャラクターはまだ公開されていません。',
    accent: '#72aeb5'
  }
]

export const emmaCharacter = characters[0]

export function getCharacter(id: CharacterId | string | undefined) {
  return characters.find((character) => character.id === id) ?? emmaCharacter
}
