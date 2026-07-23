import type { CharacterDefinition, CharacterId } from '../types'

export const characters: CharacterDefinition[] = [
  {
    id: 'emma',
    availability: 'available',
    name: 'エマ・水城',
    englishName: 'Emma Mizuki',
    age: 20,
    origin: 'アメリカ・カリフォルニア州',
    major: '国際関係学',
    hobbies: ['カフェ巡り', '映画', '写真', '散歩', '日本文化'],
    description: '明るく好奇心旺盛。あなたの言葉を優しく受け止めてくれる留学生。',
    image: '/assets/emma.png',
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
