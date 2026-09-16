import type {
  Dialogue,
  StoryChoiceNode,
  StoryChoiceOption,
  StoryFlow,
  StoryLearningCue,
  StoryNode
} from '../types'

interface AuthoredOption extends Omit<StoryChoiceOption, 'next'> {
  response: Dialogue
}

interface AuthoredSegment {
  id: string
  dialogues: Dialogue[]
  promptEnglish: string
  promptJapanese: string
  learningCue: StoryLearningCue
  options: AuthoredOption[]
}

const buildFlow = (
  chapterId: number,
  revision: number,
  segments: AuthoredSegment[],
  closing: Dialogue[]
): StoryFlow => {
  const nodes: Record<string, StoryNode> = {}
  const segmentStart = (index: number) =>
    segments[index]?.dialogues[0] ? `${segments[index].id}-d1` : `${segments[index].id}-choice`
  const closingStart = closing.length ? `c${chapterId}-closing-1` : `c${chapterId}-end`

  segments.forEach((segment, segmentIndex) => {
    segment.dialogues.forEach((dialogue, dialogueIndex) => {
      const id = `${segment.id}-d${dialogueIndex + 1}`
      nodes[id] = {
        id,
        type: 'dialogue',
        dialogue,
        next:
          dialogueIndex < segment.dialogues.length - 1
            ? `${segment.id}-d${dialogueIndex + 2}`
            : `${segment.id}-choice`
      }
    })
    const mergeTarget =
      segmentIndex < segments.length - 1 ? segmentStart(segmentIndex + 1) : closingStart
    const choiceId = `${segment.id}-choice`
    const options = segment.options.map((option) => {
      const responseId = `${segment.id}-${option.id}-response`
      nodes[responseId] = {
        id: responseId,
        type: 'dialogue',
        dialogue: option.response,
        next: mergeTarget
      }
      return {
        id: option.id,
        englishText: option.englishText,
        japaneseText: option.japaneseText,
        naturalExpression: option.naturalExpression,
        feedback: option.feedback,
        affectionChange: option.affectionChange,
        trustChange: option.trustChange,
        englishXp: option.englishXp,
        next: responseId
      }
    })
    nodes[choiceId] = {
      id: choiceId,
      type: 'choice',
      promptEnglish: segment.promptEnglish,
      promptJapanese: segment.promptJapanese,
      learningCue: segment.learningCue,
      options
    } satisfies StoryChoiceNode
  })

  closing.forEach((dialogue, index) => {
    const id = `c${chapterId}-closing-${index + 1}`
    nodes[id] = {
      id,
      type: 'dialogue',
      dialogue,
      next: index < closing.length - 1 ? `c${chapterId}-closing-${index + 2}` : `c${chapterId}-end`
    }
  })
  nodes[`c${chapterId}-end`] = { id: `c${chapterId}-end`, type: 'ending' }
  return { chapterId, revision, startNodeId: segmentStart(0), nodes }
}

const cue = (
  id: string,
  title: string,
  construction: string,
  explanationEn: string,
  explanationJa: string
): StoryLearningCue => ({ id, title, construction, explanationEn, explanationJa })

const option = (
  id: string,
  englishText: string,
  japaneseText: string,
  naturalExpression: string,
  feedback: string,
  affectionChange: number,
  trustChange: number,
  englishXp: number,
  response: Dialogue
): AuthoredOption => ({
  id,
  englishText,
  japaneseText,
  naturalExpression,
  feedback,
  affectionChange,
  trustChange,
  englishXp,
  response
})

const chapter1 = buildFlow(
  1,
  2,
  [
    {
      id: 'c1-s1',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'I saw the moving boxes by the door, so I thought it might be you.',
          japanese: '玄関に引っ越しの箱があったから、もしかしてあなたかなって思ったの。',
          expression: 'smile'
        },
        {
          speaker: 'Emma',
          english: 'Hi! Are you the new housemate?',
          japanese: 'こんにちは！新しく入居した人？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'How will you introduce yourself?',
      promptJapanese: 'どう自己紹介する？',
      learningCue: cue(
        'c1-introduction',
        '初対面の自己紹介',
        'My name is … / Nice to meet you.',
        'Use My name is to introduce yourself, then Nice to meet you to sound warm and polite.',
        '「My name is …」で名乗り、「Nice to meet you.」を添えると丁寧で親しみのある自己紹介になります。'
      ),
      options: [
        option(
          'warm',
          'Yes, I am. My name is {{name}}. Nice to meet you.',
          'はい、そうです。{{name}}です。はじめまして。',
          'My name is {{name}}. Nice to meet you.',
          '丁寧で自然な自己紹介です。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Nice to meet you too, {{name}}! I’m Emma.',
            japanese: 'こちらこそ、はじめまして、{{name}}！エマだよ。',
            expression: 'smile'
          }
        ),
        option(
          'simple',
          'Yes. I’m {{name}}.',
          'はい。{{name}}です。',
          'Hi, I’m {{name}}. Nice to meet you.',
          '意味は自然に伝わります。あいさつを足すとさらに柔らかくなります。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Hi, {{name}}. I’m Emma. Welcome!',
            japanese: 'こんにちは、{{name}}。エマだよ。ようこそ！',
            expression: 'normal'
          }
        ),
        option(
          'abrupt',
          'I am the new housemate.',
          '私が新しい同居人です。',
          'Yes, I am. I’m {{name}}. Nice to meet you.',
          '文法は正しいですが、名前とあいさつがあると初対面では自然です。',
          0,
          0,
          5,
          {
            speaker: 'Emma',
            english: 'Oh, right. I’m Emma. What should I call you?',
            japanese: 'そっか。私はエマ。何て呼べばいい？',
            expression: 'normal'
          }
        )
      ]
    },
    {
      id: 'c1-s2',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'People from all over the world live in this house.',
          japanese: 'この家には、いろいろな国から来た人が住んでいるんだよ。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'Where are you from?',
          japanese: 'どこの出身？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Tell Emma where you are from.',
      promptJapanese: '出身地を伝えよう',
      learningCue: cue(
        'c1-from',
        '出身地を伝える',
        'I’m from …',
        'Use be from followed by a place to say where you come from.',
        '出身地は「be from＋場所」で表します。現在住んでいる場所を表す「live in」と区別しましょう。'
      ),
      options: [
        option(
          'from',
          'I’m from Japan. How about you?',
          '日本出身です。エマは？',
          'I’m from Japan. How about you?',
          '答えに聞き返しを加え、会話を自然に続けています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'I grew up in the U.S. and Japan. We already have something in common!',
            japanese: 'アメリカと日本で育ったの。もう共通点があるね！',
            expression: 'smile'
          }
        ),
        option(
          'short',
          'I’m from Japan.',
          '日本出身です。',
          'I’m from Japan.',
          '短くても自然で正しい答えです。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Japan? Me too, partly. That makes me happy.',
            japanese: '日本？私も一部はそうだよ。なんだかうれしいな。',
            expression: 'smile'
          }
        ),
        option(
          'grammar',
          'I from Japan.',
          '私は日本からです。',
          'I’m from Japan.',
          '出身を言うときは主語の後にbe動詞が必要です。',
          0,
          0,
          5,
          {
            speaker: 'Emma',
            english: 'Oh, you’re from Japan? That’s nice!',
            japanese: 'あ、日本出身なんだね。いいね！',
            expression: 'normal'
          }
        )
      ]
    },
    {
      id: 'c1-s3',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'It’s nice to know what everyone enjoys outside work and school.',
          japanese: '仕事や学校以外で、みんなが何を楽しんでいるか知るのっていいよね。',
          expression: 'smile'
        },
        {
          speaker: 'Emma',
          english: 'What do you like to do on weekends?',
          japanese: '週末は何をするのが好き？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Share a hobby.',
      promptJapanese: '趣味について話そう',
      learningCue: cue(
        'c1-like-gerund',
        '好きなことを話す',
        'I like + -ing',
        'After like, an -ing form is a natural way to talk about activities you enjoy.',
        '好きな活動は「like＋動詞の-ing形」で自然に表せます。'
      ),
      options: [
        option(
          'shared',
          'I like watching movies and going for walks.',
          '映画を見たり散歩したりするのが好きです。',
          'I like watching movies and going for walks.',
          '並列した動名詞で趣味を自然に伝えています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Really? Me too! Maybe we can watch a movie sometime.',
            japanese: '本当？私も！今度一緒に映画を観ようよ。',
            expression: 'smile'
          }
        ),
        option(
          'one-hobby',
          'I like watching movies.',
          '映画を見るのが好きです。',
          'I like watching movies.',
          '簡潔で自然な趣味の伝え方です。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'I love movies too. We should compare favorites later!',
            japanese: '私も映画が大好き。今度お気に入りを比べよう！',
            expression: 'smile'
          }
        ),
        option(
          'tense',
          'I watched movies on weekends.',
          '週末に映画を見ました。',
          'I watch movies on weekends.',
          '習慣には過去形ではなく現在形を使います。',
          0,
          1,
          5,
          {
            speaker: 'Emma',
            english: 'So you watch movies on weekends? That sounds relaxing.',
            japanese: '週末は映画を見るんだね。ゆっくりできそう。',
            expression: 'normal'
          }
        )
      ]
    }
  ],
  [
    {
      speaker: 'Player',
      english: 'Thanks for making me feel welcome, Emma.',
      japanese: '温かく迎えてくれてありがとう、エマ。',
      expression: 'normal'
    },
    {
      speaker: 'Emma',
      english: 'I’m glad you moved in. Let’s talk again soon!',
      japanese: 'あなたが引っ越してきてよかった。またすぐ話そうね！',
      expression: 'smile'
    }
  ]
)

const chapter2 = buildFlow(
  2,
  2,
  [
    {
      id: 'c2-s1',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'I was checking the fridge, and we still have plenty of ingredients.',
          japanese: '冷蔵庫を見ていたら、まだ食材がたくさん残っていたよ。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'I’m getting hungry. Do you want to cook together?',
          japanese: 'お腹が空いてきた。一緒に料理しない？',
          expression: 'smile'
        }
      ],
      promptEnglish: 'Accept Emma’s invitation.',
      promptJapanese: 'エマの誘いに答えよう',
      learningCue: cue(
        'c2-accept',
        '誘いを受ける',
        'I’d love to.',
        'I’d love to is a warm, enthusiastic way to accept an invitation.',
        '「I’d love to.」は誘いを喜んで受ける、温かく自然な表現です。'
      ),
      options: [
        option(
          'enthusiastic',
          'I’d love to. What should we make?',
          'ぜひ。一緒に何を作ろうか？',
          'I’d love to. What should we make?',
          '誘いを温かく受け、次の相談につなげています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Yay! I was hoping you’d say yes.',
            japanese: 'やった！そう言ってくれたらいいなって思ってた。',
            expression: 'smile'
          }
        ),
        option(
          'yes',
          'Sure, let’s cook.',
          'もちろん、料理しよう。',
          'Sure, let’s cook together.',
          '自然な承諾です。「together」を加えると誘いによりよく応えられます。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Great! It’ll be more fun together.',
            japanese: 'いいね！一緒ならもっと楽しいね。',
            expression: 'smile'
          }
        ),
        option(
          'flat',
          'Okay.',
          'いいよ。',
          'Sure, I’d love to.',
          '意味は伝わりますが、ひと言加えると気持ちが伝わります。',
          0,
          0,
          5,
          {
            speaker: 'Emma',
            english: 'Okay, let’s see what we have in the kitchen.',
            japanese: 'じゃあ、キッチンに何があるか見てみよう。',
            expression: 'normal'
          }
        )
      ]
    },
    {
      id: 'c2-s2',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'Let’s use what we already have instead of going to the store.',
          japanese: '買い物に行かずに、今あるものを使おうよ。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'We have vegetables and chicken. What should we make?',
          japanese: '野菜と鶏肉があるよ。何を作ろうか？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Make a suggestion.',
      promptJapanese: '料理を提案しよう',
      learningCue: cue(
        'c2-how-about',
        '提案する',
        'How about + noun / -ing?',
        'Use How about followed by a noun or -ing form to make a friendly suggestion.',
        '親しみのある提案には「How about＋名詞／動詞-ing形？」を使います。'
      ),
      options: [
        option(
          'curry',
          'How about making curry?',
          'カレーを作るのはどう？',
          'How about making curry?',
          'How aboutの後に動名詞を使った自然な提案です。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Perfect! Curry sounds warm and comforting.',
            japanese: 'いいね！カレーって温かくてほっとするよね。',
            expression: 'smile'
          }
        ),
        option(
          'direct',
          'Let’s make curry.',
          'カレーを作ろう。',
          'Let’s make curry.',
          'はっきりした自然な提案です。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Curry it is! I’ll get the spices.',
            japanese: 'カレーに決まり！スパイスを出すね。',
            expression: 'smile'
          }
        ),
        option(
          'order',
          'What we should make?',
          '何を私たちは作るべき？',
          'What should we make?',
          '疑問文ではshouldを主語の前に置きます。',
          0,
          1,
          5,
          {
            speaker: 'Emma',
            english: 'Hmm, what should we make? Maybe curry?',
            japanese: 'うーん、何を作ろうか。カレーはどう？',
            expression: 'normal'
          }
        )
      ]
    },
    {
      id: 'c2-s3',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'I’ll start heating the pan so we can cook everything at the same time.',
          japanese: '同じタイミングで仕上がるように、フライパンを温め始めるね。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'Could you chop the vegetables while I cook the chicken?',
          japanese: '私が鶏肉を焼く間、野菜を切ってくれる？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Respond to the request.',
      promptJapanese: 'お願いに答えよう',
      learningCue: cue(
        'c2-could-you',
        '丁寧に頼む・応じる',
        'Could you …? / Of course.',
        'Could you makes a polite request. Of course or Sure is a natural positive response.',
        '「Could you …?」は丁寧な依頼です。応じるときは「Of course.」「Sure.」が自然です。'
      ),
      options: [
        option(
          'helpful',
          'Of course. I’ll chop them now.',
          'もちろん。今切るね。',
          'Of course. I’ll chop them now.',
          '快く引き受け、willでその場の行動を伝えています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Thank you! We make a good team.',
            japanese: 'ありがとう！私たち、いいチームだね。',
            expression: 'smile'
          }
        ),
        option(
          'sure',
          'Sure, I can do that.',
          'もちろん、できるよ。',
          'Sure, I can do that.',
          '依頼への自然で協力的な返答です。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Thanks! The cutting board is over there.',
            japanese: 'ありがとう！まな板はあそこだよ。',
            expression: 'normal'
          }
        ),
        option(
          'command',
          'You chop them.',
          'あなたが切って。',
          'Could you chop them instead?',
          '命令形は強く響きます。代案もCould youで丁寧に伝えられます。',
          -1,
          -1,
          5,
          {
            speaker: 'Emma',
            english: 'Oh… I thought we were cooking together.',
            japanese: 'あれ…一緒に料理すると思ってたんだけど。',
            expression: 'confused'
          }
        )
      ]
    }
  ],
  [
    {
      speaker: 'Player',
      english: 'We should cook together again sometime.',
      japanese: 'また今度、一緒に料理しよう。',
      expression: 'normal'
    },
    {
      speaker: 'Emma',
      english: 'That smells so good! Cooking with you is fun.',
      japanese: 'すごくいい匂い！一緒に料理するの、楽しいね。',
      expression: 'smile'
    }
  ]
)

const chapter3 = buildFlow(
  3,
  2,
  [
    {
      id: 'c3-s1',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'I passed the station after class and noticed a place I hadn’t seen before.',
          japanese: '授業のあと駅の前を通ったら、見たことのないお店に気づいたの。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'There’s a new café near the station. I really want to try it.',
          japanese: '駅の近くに新しいカフェがあるの。すごく行ってみたいな。',
          expression: 'smile'
        }
      ],
      promptEnglish: 'Show interest in Emma’s idea.',
      promptJapanese: 'エマの話に興味を示そう',
      learningCue: cue(
        'c3-sounds',
        '興味を示す',
        'That sounds + adjective.',
        'Use That sounds followed by an adjective to react to an idea or plan.',
        '相手の案や予定への感想は「That sounds＋形容詞」で表せます。'
      ),
      options: [
        option(
          'great',
          'That sounds great. What’s the café like?',
          'よさそう。どんなカフェなの？',
          'That sounds great. What’s the café like?',
          '感想と質問を組み合わせ、関心を自然に示しています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'It has a quiet terrace and amazing cakes.',
            japanese: '静かなテラスがあって、ケーキもすごくおいしいんだって。',
            expression: 'smile'
          }
        ),
        option(
          'nice',
          'That sounds nice.',
          'よさそうだね。',
          'That sounds nice.',
          '相手の案への自然で肯定的な反応です。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Right? I’ve been curious about it.',
            japanese: 'でしょ？ずっと気になってたの。',
            expression: 'smile'
          }
        ),
        option(
          'boring',
          'That sounds boring.',
          'つまらなそう。',
          'Cafés aren’t usually my thing, but I’d like to hear about it.',
          '好みが違うときも、相手への関心を添えると会話が続きます。',
          -1,
          -1,
          5,
          {
            speaker: 'Emma',
            english: 'Oh… I thought it might be fun.',
            japanese: 'そっか…楽しそうだと思ったんだけど。',
            expression: 'confused'
          }
        )
      ]
    },
    {
      id: 'c3-s2',
      dialogues: [
        {
          speaker: 'Emma',
          english: 'I don’t have any plans yet, and the weather is supposed to be nice.',
          japanese: 'まだ予定はないし、天気もよくなるみたい。',
          expression: 'smile'
        },
        {
          speaker: 'Emma',
          english: 'I’m free this weekend.',
          japanese: '今週末は空いてるよ。',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Invite Emma to the café.',
      promptJapanese: 'エマをカフェに誘おう',
      learningCue: cue(
        'c3-would-like',
        '丁寧に誘う',
        'Would you like to …?',
        'Would you like to is a polite, natural way to invite someone.',
        '相手を丁寧に誘うときは「Would you like to＋動詞？」が自然です。'
      ),
      options: [
        option(
          'polite',
          'Would you like to go with me on Saturday?',
          '土曜日に一緒に行かない？',
          'Would you like to go with me on Saturday?',
          '丁寧な誘いに具体的な日を添えています。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'I’d love to! Saturday is perfect.',
            japanese: 'ぜひ！土曜日ならぴったり。',
            expression: 'blush'
          }
        ),
        option(
          'casual',
          'Do you want to go together?',
          '一緒に行かない？',
          'Do you want to go together?',
          '親しい相手への自然でカジュアルな誘いです。',
          2,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Yes! Let’s go together.',
            japanese: 'うん！一緒に行こう。',
            expression: 'smile'
          }
        ),
        option(
          'broken',
          'You go café with me?',
          '僕とカフェ行く？',
          'Would you like to go to the café with me?',
          'goの目的地にはtoが必要です。丁寧な誘いならWould you like toも使えます。',
          0,
          0,
          5,
          {
            speaker: 'Emma',
            english: 'Go to the café with you? Sure!',
            japanese: '一緒にカフェへ行くってこと？いいよ！',
            expression: 'normal'
          }
        )
      ]
    },
    {
      id: 'c3-s3',
      dialogues: [
        {
          speaker: 'Emma',
          english:
            'The café gets busy in the afternoon, so meeting a little earlier might be good.',
          japanese: 'そのカフェ、午後は混むみたいだから、少し早めに会うのがよさそう。',
          expression: 'normal'
        },
        {
          speaker: 'Emma',
          english: 'What time should we meet?',
          japanese: '何時に会おうか？',
          expression: 'normal'
        }
      ],
      promptEnglish: 'Suggest a meeting time.',
      promptJapanese: '待ち合わせ時間を提案しよう',
      learningCue: cue(
        'c3-how-about-time',
        '時間を提案する',
        'How about + time?',
        'How about followed by a time is a simple, friendly way to suggest when to meet.',
        '待ち合わせ時間の提案には「How about＋時刻？」が簡潔で自然です。'
      ),
      options: [
        option(
          'two',
          'How about two o’clock at the station?',
          '駅で2時はどう？',
          'How about two o’clock at the station?',
          '時刻と場所を一緒に示した分かりやすい提案です。',
          2,
          2,
          8,
          {
            speaker: 'Emma',
            english: 'Two at the station sounds perfect. It’s a date!',
            japanese: '駅で2時、いいね。デートだね！',
            expression: 'blush'
          }
        ),
        option(
          'at-two',
          'Let’s meet at two.',
          '2時に会おう。',
          'Let’s meet at two.',
          'atを使って時刻を自然に伝えています。',
          1,
          1,
          6,
          {
            speaker: 'Emma',
            english: 'Two works for me. I’ll see you then!',
            japanese: '2時で大丈夫。そのとき会おうね！',
            expression: 'smile'
          }
        ),
        option(
          'missing-at',
          'Let’s meet two o’clock.',
          '2時に会おう。',
          'Let’s meet at two o’clock.',
          '具体的な時刻の前には前置詞atを使います。',
          0,
          1,
          5,
          {
            speaker: 'Emma',
            english: 'At two o’clock? That works!',
            japanese: '2時だね？大丈夫！',
            expression: 'normal'
          }
        )
      ]
    }
  ],
  [
    {
      speaker: 'Player',
      english: 'Me too. I think it’s going to be a great day.',
      japanese: '僕も。きっと楽しい一日になると思う。',
      expression: 'normal'
    },
    {
      speaker: 'Emma',
      english: 'I’m looking forward to it. See you this weekend!',
      japanese: '楽しみにしてる。週末に会おうね！',
      expression: 'blush'
    }
  ]
)

export const storyFlows: Record<number, StoryFlow> = {
  1: chapter1,
  2: chapter2,
  3: chapter3
}

export const getStoryFlow = (chapterId: number) => storyFlows[chapterId]
