import { readFileSync, writeFileSync } from 'node:fs'

const frequencyPath = process.argv[2]
const dictionaryDir = process.argv[3]
const basicListPath = process.argv[4]
const schoolListPath = process.argv[5]
const outputPath = process.argv[6] ?? 'src/data/vocabulary.ts'

if (!frequencyPath || !dictionaryDir || !basicListPath || !schoolListPath) {
  throw new Error('Usage: node scripts/generate-vocabulary.mjs <frequency-list> <ejdict-src-dir> <basic-list> <school-list> [output]')
}

const dictionary = new Map()
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
  const lines = readFileSync(`${dictionaryDir}/${letter}.txt`, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const [heads, definition] = line.split('\t')
    if (!heads || !definition) continue
    for (const head of heads.split(',')) {
      const word = head.trim().toLowerCase()
      if (/^[a-z]+$/.test(word) && !dictionary.has(word)) dictionary.set(word, definition.trim())
    }
  }
}

const excluded = new Set([
  'sex','porn','xxx','nude','naked','escort','casino','poker','betting','viagra','pharmacy',
  'web','website','www','http','html','click','download','software','windows','copyright',
  'privacy','terms','email','online','site','sites','com','org','net','forum','forums',
  'login','password','username','server','hosting','domain','browser','javascript','php',
  'pdf','jpg','jpeg','gif','mp3','dvd','cd','inc','ltd','faq','rss','xml','blog','blogs',
  'google','yahoo','amazon','ebay','microsoft','apple','linux','adobe','sony','samsung',
  'america','american','english','japan','japanese','china','chinese','europe','european',
  'john','david','michael','james','robert','mary','paul','mark','george','thomas'
])

const meaningOverrides = {
  the:'その、例の', of:'〜の、〜について', and:'〜と、そして', to:'〜へ、〜するために',
  in:'〜の中に', is:'〜です、〜である', you:'あなた、あなたたち', that:'あれ、その',
  it:'それ', he:'彼', was:'〜でした、〜だった', for:'〜のために', on:'〜の上に',
  are:'〜です、〜である', as:'〜として、〜のように', with:'〜と一緒に、〜を使って',
  his:'彼の', they:'彼ら、彼女ら', at:'〜で、〜に', be:'〜である、〜になる',
  this:'これ、この', from:'〜から', have:'持っている', or:'または', one:'1、一つのもの',
  had:'持っていた', by:'〜によって、〜のそばに', but:'しかし', not:'〜ではない',
  what:'何、どんな', all:'すべての', were:'〜でした、〜だった', when:'いつ、〜するとき',
  we:'私たち', there:'そこに、そこへ', can:'〜できる', an:'一つの、ある',
  your:'あなたの', which:'どちら、どの', their:'彼らの、彼女らの', said:'言った',
  if:'もし〜なら', do:'する', will:'〜するつもりだ、〜でしょう', each:'それぞれの',
  about:'〜について', how:'どのように', up:'上へ', out:'外へ', them:'彼らを、彼女らを',
  then:'そのとき、それから', she:'彼女', many:'多くの', some:'いくつかの',
  so:'そのように、だから', these:'これら', would:'〜だろう、〜したい',
  other:'ほかの', into:'〜の中へ', has:'持っている', more:'もっと多くの',
  her:'彼女の、彼女を', two:'2、二つの', him:'彼を、彼に', see:'見る、分かる',
  time:'時間、時', could:'〜できた、〜かもしれない', no:'いいえ、一つもない',
  make:'作る、〜にする', than:'〜よりも', first:'最初の、一番目の', been:'〜であった',
  its:'それの', who:'だれ、〜する人', now:'今', people:'人々',
  my:'私の', made:'作った、〜製の', over:'〜の上を、〜を越えて', did:'した',
  down:'下へ', only:'ただ一つの、〜だけ', way:'方法、道', find:'見つける',
  use:'使う、使用', may:'〜してもよい、〜かもしれない', water:'水',
  long:'長い、長く', little:'小さい、少しの', very:'とても', after:'〜の後で',
  words:'単語、言葉', called:'呼んだ、〜と呼ばれる', just:'ちょうど、ただ',
  where:'どこ、〜する場所', most:'最も多い、大部分', know:'知っている',
  get:'得る、〜になる', through:'〜を通って', back:'後ろへ、戻って',
  much:'多くの、ずっと', before:'〜の前に', go:'行く', good:'よい',
  new:'新しい', write:'書く', our:'私たちの', used:'使った、使用済みの',
  me:'私を、私に', man:'男性、人', too:'〜もまた、あまりに', any:'どれでも、いくらかの',
  day:'日、昼間', same:'同じ', right:'正しい、右', look:'見る、〜に見える',
  think:'考える、思う', also:'〜もまた', around:'〜の周りに', another:'もう一つの',
  came:'来た', come:'来る', work:'働く、仕事', three:'3、三つの',
  must:'〜しなければならない', because:'なぜなら、〜なので', does:'する',
  part:'部分、役割', even:'〜さえ、平らな', place:'場所、置く',
  well:'上手に、よく', such:'そのような', here:'ここに', take:'取る、連れて行く',
  why:'なぜ', help:'助ける、助け', put:'置く', different:'異なる',
  away:'離れて', again:'もう一度', off:'離れて、電源が切れて', went:'行った',
  old:'古い、年を取った', number:'数、番号', great:'素晴らしい、大きな',
  tell:'伝える、話す', men:'男性たち', say:'言う', small:'小さい',
  every:'すべての、毎〜', found:'見つけた', still:'まだ、それでも',
  between:'〜の間に', name:'名前', should:'〜すべきだ', home:'家、家庭',
  big:'大きい', give:'与える', air:'空気', line:'線、列', set:'置く、一組',
  own:'自分自身の、所有する', under:'〜の下に', read:'読む', last:'最後の、続く',
  never:'決して〜ない', us:'私たちを、私たちに', left:'左の、残った、去った',
  end:'終わり、終える', along:'〜に沿って', while:'〜する間', might:'〜かもしれない',
  next:'次の', sound:'音、〜に聞こえる', below:'〜の下に', saw:'見た',
  something:'何か', thought:'考えた、考え', both:'両方の', few:'少数の',
  those:'あれら、それら', always:'いつも', show:'見せる、番組',
  large:'大きい、広い', often:'しばしば', together:'一緒に', asked:'尋ねた、頼んだ',
  house:'家', world:'世界', going:'行くこと、進行中の', want:'欲しい、〜したい',
  school:'学校', important:'重要な', until:'〜まで', form:'形、用紙',
  food:'食べ物', keep:'保つ、続ける', children:'子どもたち', feet:'足',
  land:'土地、着陸する', side:'側、側面', without:'〜なしで',
  boy:'少年', once:'一度、かつて', animal:'動物', life:'生活、命',
  enough:'十分な', took:'取った', sometimes:'時々', four:'4、四つの',
  head:'頭、先頭', above:'〜の上に', kind:'親切な、種類', began:'始めた',
  almost:'ほとんど', live:'住む、生きる', page:'ページ', got:'得た、〜になった',
  earth:'地球、大地', need:'必要とする、必要', far:'遠く、遠い',
  hand:'手', high:'高い', year:'年', mother:'母', light:'光、軽い',
  country:'国、田舎', father:'父', let:'〜させる', night:'夜',
  picture:'絵、写真', being:'存在、〜であること', study:'勉強する、研究',
  second:'2番目の、秒', soon:'すぐに', story:'物語', since:'〜以来、〜なので',
  white:'白い', ever:'これまでに', paper:'紙、論文', hard:'難しい、懸命に',
  near:'近くに、近い', sentence:'文', better:'よりよい', best:'最もよい',
  across:'〜を横切って', during:'〜の間に', today:'今日', however:'しかしながら',
  sure:'確かな', knew:'知っていた', try:'試す、努力する', told:'伝えた',
  young:'若い', sun:'太陽', thing:'物、こと', whole:'全体の',
  hear:'聞く', example:'例', heard:'聞いた', several:'いくつかの',
  change:'変える、変化', answer:'答える、答え', room:'部屋、空間',
  sea:'海', against:'〜に対して', top:'頂上、上部', turned:'向きを変えた',
  learn:'学ぶ', point:'点、要点', city:'都市', play:'遊ぶ、演じる',
  toward:'〜の方へ', five:'5、五つの', himself:'彼自身', usually:'たいてい',
  money:'お金', seen:'見たことがある、見られた', car:'車', morning:'朝',
  wanted:'欲しかった', later:'後で', family:'家族', group:'集団',
  really:'本当に', body:'体', leave:'去る、残す', friend:'友達'
}

const normalizeMeaning = (definition) => definition
  .replace(/[〈《{].*?[〉》}]/g, '')
  .replace(/\([^)]{18,}\)/g, '')
  .replace(/\s+/g, ' ')
  .split(/[;/]/)[0]
  .trim()
  .slice(0, 64)

const inferPart = (definition, word) => {
  if (definition.includes('{動}') || /する[,)・]/.test(definition) || /^(be|have|do|can|will|may|must)$/.test(word)) return 'verb'
  if (definition.includes('{形}') || /(ful|less|ous|ive|able|ible|al|ic|ish|ary)$/.test(word)) return 'adjective'
  if (definition.includes('{副}') || word.endsWith('ly')) return 'adverb'
  if (/^(a|an|the|and|or|but|if|because|as|of|to|in|on|at|for|from|with|by|about|into|over|after|before|under|between|through|during|without|against|among|i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|its|our|their|this|that|these|those|who|what|which|where|when|why|how|some|any|each|every|all|both|many|much|few|more|most|other|another|no|not|so|than)$/.test(word)) return 'other'
  return 'noun'
}

const levelCounts = [150, 170, 170, 170, 170, 170]
const levelEnds = levelCounts.reduce((all, count) => [...all, (all.at(-1) ?? 0) + count], [])
const levelFor = (index) => levelEnds.findIndex((end) => index < end) + 1
const categoryFor = {
  noun: '人・もの',
  verb: '動作',
  adjective: '状態・特徴',
  adverb: '様子',
  other: '基本表現'
}

const frequencyWords = readFileSync(frequencyPath, 'utf8').split(/\r?\n/)
const basicWords = new Set(readFileSync(basicListPath, 'utf8').split(/\r?\n/).map((word) => word.trim().toLowerCase()))
const schoolWords = new Set(readFileSync(schoolListPath, 'utf8').split(/\r?\n/).map((word) => word.trim().toLowerCase()))
const selected = []
function addWords(allowlist, targetSize) {
  for (const raw of frequencyWords) {
    if (selected.length >= targetSize) break
    const word = raw.trim().toLowerCase()
    if (
      excluded.has(word) ||
      !allowlist.has(word) ||
      !/^[a-z]{2,14}$/.test(word) ||
      !dictionary.has(word) ||
      selected.some((entry) => entry.word === word)
    ) continue

    const rawDefinition = dictionary.get(word)
    const meaningJa = meaningOverrides[word] ?? normalizeMeaning(rawDefinition)
    if (!meaningJa || /差別的表現|卑わい|わいせつ/.test(rawDefinition)) continue

    const partOfSpeech = inferPart(rawDefinition, word)
    const level = levelFor(selected.length)
    selected.push({
      id: `v${String(selected.length + 1).padStart(4, '0')}`,
      word,
      meaningJa,
      partOfSpeech,
      level,
      example: `Emma wrote “${word}” in her vocabulary notebook.`,
      exampleJa: `エマは単語ノートに「${word}（${meaningJa}）」と書きました。`,
      category: categoryFor[partOfSpeech]
    })
  }
}
addWords(basicWords, 660)
addWords(schoolWords, 1000)

if (selected.length !== 1000) throw new Error(`Expected 1000 words, generated ${selected.length}`)

const levels = [
  { id: 1, title: 'First Steps', subtitle: '中学1年・基礎', wordCount: 150, color: '#f5a7ba' },
  { id: 2, title: 'Everyday Words', subtitle: '中学2年・基礎', wordCount: 170, color: '#f4bd8f' },
  { id: 3, title: 'Growing Skills', subtitle: '中学3年・標準', wordCount: 170, color: '#8fd0bd' },
  { id: 4, title: 'High School Basics', subtitle: '高校基礎', wordCount: 170, color: '#8bbdd9' },
  { id: 5, title: 'Express Yourself', subtitle: '高校標準', wordCount: 170, color: '#a6a0df' },
  { id: 6, title: 'Advanced Steps', subtitle: '高校発展', wordCount: 170, color: '#cf9dcc' }
]

const source = `import type { VocabularyLevel, VocabularyWord } from '../types'\n\n` +
  `export const vocabularyLevels: VocabularyLevel[] = ${JSON.stringify(levels, null, 2)}\n\n` +
  `export const vocabularyWords: VocabularyWord[] = ${JSON.stringify(selected, null, 2)}\n`

writeFileSync(outputPath, source)
console.log(`Generated ${selected.length} vocabulary words at ${outputPath}`)
