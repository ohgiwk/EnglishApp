import type { VocabularyWord } from '../types'
import { reorderExamples } from './reorder-examples'

export interface VocabularyExample {
  english: string
  japanese: string
}

const coreExamples: Record<string, VocabularyExample> = {
  the: { english: 'The train arrived on time.', japanese: 'その電車は時間どおりに到着しました。' },
  of: { english: 'A cup of tea warmed her hands.', japanese: '一杯のお茶が彼女の手を温めました。' },
  and: {
    english: 'Emma and I walked home together.',
    japanese: 'エマと私は一緒に歩いて帰りました。'
  },
  to: {
    english: 'We went to the library after school.',
    japanese: '放課後、私たちは図書館へ行きました。'
  },
  in: { english: 'The keys are in my bag.', japanese: '鍵は私のかばんの中にあります。' },
  for: { english: 'This letter is for you.', japanese: 'この手紙はあなた宛てです。' },
  on: { english: 'Your book is on the desk.', japanese: 'あなたの本は机の上にあります。' },
  that: { english: 'I think that Emma is right.', japanese: '私はエマが正しいと思います。' },
  by: { english: 'She sat by the window.', japanese: '彼女は窓のそばに座りました。' },
  this: { english: 'This cake tastes wonderful.', japanese: 'このケーキはとてもおいしいです。' },
  with: { english: 'I had lunch with my sister.', japanese: '私は姉と一緒に昼食をとりました。' },
  you: { english: 'You always make me smile.', japanese: 'あなたはいつも私を笑顔にしてくれます。' },
  it: {
    english: 'It looks beautiful in the morning light.',
    japanese: 'それは朝の光の中で美しく見えます。'
  },
  not: { english: 'This bag is not mine.', japanese: 'このかばんは私のものではありません。' },
  or: {
    english: 'Would you like tea or coffee?',
    japanese: '紅茶とコーヒーのどちらがいいですか。'
  },
  be: { english: 'Please be careful on the stairs.', japanese: '階段では気をつけてください。' },
  from: {
    english: 'This postcard came from Canada.',
    japanese: 'この絵はがきはカナダから届きました。'
  },
  at: { english: 'Let’s meet at the station.', japanese: '駅で会いましょう。' },
  as: { english: 'She works as a designer.', japanese: '彼女はデザイナーとして働いています。' },
  all: { english: 'All the windows were open.', japanese: '窓はすべて開いていました。' },
  have: { english: 'We have enough time for lunch.', japanese: '昼食をとる時間は十分にあります。' },
  more: { english: 'Could I have more water?', japanese: 'もう少し水をいただけますか。' },
  we: { english: 'We watched the sunset together.', japanese: '私たちは一緒に夕日を眺めました。' },
  will: { english: 'I will call you tomorrow.', japanese: '明日あなたに電話します。' },
  can: { english: 'You can sit here.', japanese: 'ここに座ってもいいですよ。' },
  about: {
    english: 'We talked about our weekend plans.',
    japanese: '私たちは週末の予定について話しました。'
  },
  if: { english: 'Call me if you need help.', japanese: '助けが必要なら電話してください。' },
  but: {
    english: 'The walk was long but enjoyable.',
    japanese: '散歩は長かったですが楽しかったです。'
  },
  one: {
    english: 'I saved one seat for you.',
    japanese: 'あなたのために席を一つ取っておきました。'
  },
  other: {
    english: 'The other door leads outside.',
    japanese: 'もう一方のドアは外へ通じています。'
  },
  do: {
    english: 'What do you usually do after work?',
    japanese: '仕事のあと、普段は何をしますか。'
  },
  no: { english: 'There is no milk in the fridge.', japanese: '冷蔵庫に牛乳はありません。' },
  they: { english: 'They live near the river.', japanese: '彼らは川の近くに住んでいます。' },
  he: {
    english: 'He made breakfast for everyone.',
    japanese: '彼はみんなのために朝食を作りました。'
  },
  may: { english: 'It may rain this afternoon.', japanese: '今日の午後は雨が降るかもしれません。' },
  what: { english: 'What did you see in the park?', japanese: '公園で何を見ましたか。' },
  which: { english: 'Which color do you prefer?', japanese: 'どちらの色が好きですか。' },
  any: { english: 'Do you have any questions?', japanese: '何か質問はありますか。' },
  so: {
    english: 'It was cold, so I closed the window.',
    japanese: '寒かったので、窓を閉めました。'
  },
  when: { english: 'Call me when you arrive.', japanese: '着いたら電話してください。' },
  who: {
    english: 'Who left this note on the table?',
    japanese: '誰がこのメモをテーブルに置いたのですか。'
  },
  would: { english: 'I would like a glass of water.', japanese: '水を一杯いただきたいです。' },
  how: {
    english: 'How did you find this place?',
    japanese: 'どうやってこの場所を見つけたのですか。'
  },
  some: {
    english: 'We bought some fresh bread.',
    japanese: '私たちは焼きたてのパンを少し買いました。'
  },
  these: { english: 'These flowers smell lovely.', japanese: 'これらの花はよい香りがします。' },
  than: {
    english: 'This route is shorter than the old one.',
    japanese: 'この道は以前の道より短いです。'
  },
  over: { english: 'A bird flew over the lake.', japanese: '鳥が湖の上を飛びました。' },
  into: { english: 'She poured the tea into a cup.', japanese: '彼女はカップに紅茶を注ぎました。' },
  most: {
    english: 'Most students enjoyed the lesson.',
    japanese: 'ほとんどの生徒が授業を楽しみました。'
  },
  after: { english: 'We went for a walk after dinner.', japanese: '夕食後に散歩へ行きました。' },
  through: {
    english: 'Sunlight came through the curtains.',
    japanese: 'カーテン越しに日光が差し込みました。'
  },
  each: {
    english: 'Each child received a small gift.',
    japanese: '子どもたちは一人ずつ小さな贈り物を受け取りました。'
  },
  she: { english: 'She plays the piano every evening.', japanese: '彼女は毎晩ピアノを弾きます。' },
  many: {
    english: 'Many people visit the park in spring.',
    japanese: '春には多くの人がその公園を訪れます。'
  },
  under: {
    english: 'The cat is sleeping under the chair.',
    japanese: '猫はいすの下で眠っています。'
  },
  before: { english: 'Wash your hands before dinner.', japanese: '夕食前に手を洗ってください。' },
  because: {
    english: 'We stayed inside because it was raining.',
    japanese: '雨が降っていたので、私たちは屋内にいました。'
  },
  between: {
    english: 'The café is between the bank and the hotel.',
    japanese: 'カフェは銀行とホテルの間にあります。'
  },
  much: { english: 'We do not have much time left.', japanese: '残された時間はあまりありません。' },
  both: { english: 'Both answers are correct.', japanese: 'どちらの答えも正しいです。' },
  without: { english: 'He left without his umbrella.', japanese: '彼は傘を持たずに出かけました。' },
  during: {
    english: 'Nobody spoke during the movie.',
    japanese: '映画の間は誰も話しませんでした。'
  },
  another: {
    english: 'Could I have another cup of tea?',
    japanese: '紅茶をもう一杯いただけますか。'
  },
  why: { english: 'Why did the bus stop here?', japanese: 'なぜバスはここに止まったのですか。' },
  every: { english: 'I walk this path every morning.', japanese: '私は毎朝この道を歩きます。' },
  against: {
    english: 'The bicycle rested against the wall.',
    japanese: '自転車は壁に立てかけてありました。'
  },
  few: { english: 'Only a few seats were empty.', japanese: '空いている席はほんの少しでした。' },
  among: {
    english: 'She found the letter among the papers.',
    japanese: '彼女は書類の中から手紙を見つけました。'
  },
  must: {
    english: 'We must leave before dark.',
    japanese: '暗くなる前に出発しなければなりません。'
  },
  might: {
    english: 'Emma might join us later.',
    japanese: 'エマはあとで私たちに合流するかもしれません。'
  },
  let: {
    english: 'Let me carry that bag for you.',
    japanese: 'そのかばんを私に運ばせてください。'
  },
  word: { english: 'I could not read the final word.', japanese: '最後の一語が読めませんでした。' },
  representative: {
    english: 'A student representative spoke at the meeting.',
    japanese: '生徒代表が会議で話しました。'
  }
}

const cleanMeaning = (meaning: string) => {
  const first = meaning
    .replace(/[『』「」“”"']/g, '')
    .replace(/^\([^)]*\)/, '')
    .replace(/^[…〜]+/, '')
    .replace(/^(?:を|に|が|は)+/, '')
    .split(/[,、;]/)[0]
    .trim()
  return first || meaning.trim()
}

const verbEnding = /(?:する|できる|[うくぐすつぬぶむる])$/
const adjectiveEnding = /(?:い|な|的な)$/
const adverbEnding = /(?:に|く)$/

const generatedExample = (word: VocabularyWord): VocabularyExample => {
  const meaning = cleanMeaning(word.meaningJa)
  const looksVerb = verbEnding.test(meaning)
  const looksAdjective = !looksVerb && adjectiveEnding.test(meaning)
  const looksAdverb = !looksVerb && !looksAdjective && adverbEnding.test(meaning)
  const variant = Number(word.id.slice(1)) % 4

  if (looksVerb) {
    const takesObject = /(?:…|を)/.test(word.meaningJa)
    const object = takesObject ? ' it' : ''
    return [
      {
        english: `They learned when to ${word.word}${object} with care.`,
        japanese: `彼らは、いつ丁寧に${meaning}べきかを学びました。`
      },
      {
        english: `We need to ${word.word}${object} at the right time.`,
        japanese: `私たちは適切な時に${meaning}必要があります。`
      },
      {
        english: `It may be better to ${word.word}${object} slowly.`,
        japanese: `ゆっくり${meaning}ほうがよいかもしれません。`
      },
      {
        english: `They plan to ${word.word}${object} before noon.`,
        japanese: `彼らは正午までに${meaning}予定です。`
      }
    ][variant]
  }
  if (looksAdjective) {
    return [
      {
        english: `The change seemed ${word.word} to everyone.`,
        japanese: `その変化はみんなに${meaning}と感じられました。`
      },
      {
        english: `The final result looked ${word.word}.`,
        japanese: `最終的な結果は${meaning}ように見えました。`
      },
      {
        english: `Her idea sounded ${word.word} at first.`,
        japanese: `彼女の考えは最初、${meaning}ように思えました。`
      },
      {
        english: `The situation became ${word.word} by evening.`,
        japanese: `夕方までに状況は${meaning}なりました。`
      }
    ][variant]
  }
  if (looksAdverb) {
    return [
      {
        english: `She responded ${word.word} during the meeting.`,
        japanese: `彼女は会議で${meaning}返答しました。`
      },
      {
        english: `The group worked ${word.word} all morning.`,
        japanese: `グループは午前中ずっと${meaning}取り組みました。`
      },
      {
        english: `He explained the plan ${word.word}.`,
        japanese: `彼は計画を${meaning}説明しました。`
      },
      {
        english: `They moved ${word.word} through the station.`,
        japanese: `彼らは駅の中を${meaning}移動しました。`
      }
    ][variant]
  }
  return [
    {
      english: `We talked about the ${word.word} after class.`,
      japanese: `授業のあと、その${meaning}について話しました。`
    },
    {
      english: `The ${word.word} became part of our discussion.`,
      japanese: `その${meaning}が私たちの話し合いのテーマになりました。`
    },
    {
      english: `Everyone learned something about the ${word.word}.`,
      japanese: `みんながその${meaning}について何かを学びました。`
    },
    {
      english: `Our teacher gave an example involving the ${word.word}.`,
      japanese: `先生はその${meaning}に関する例を示しました。`
    }
  ][variant]
}

export type VocabularyExampleSource = 'curated' | 'core' | 'generated'

export const exampleSourceFor = (word: VocabularyWord): VocabularyExampleSource => {
  if (reorderExamples[word.id]) return 'curated'
  if (coreExamples[word.word]) return 'core'
  return 'generated'
}

export const naturalExampleFor = (word: VocabularyWord): VocabularyExample => {
  const curated = reorderExamples[word.id]
  if (curated) return curated
  return coreExamples[word.word] ?? generatedExample(word)
}
