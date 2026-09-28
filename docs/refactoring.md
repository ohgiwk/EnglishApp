# 学習機能の責務

- `views/VocabularySessionView.vue`：画面の配置とルート移動。
- `components/vocabulary/`：出題形式ごとの入力UI、結果、中断確認。
- `composables/useVocabularyExercise.ts`：回答中・カード確認中・結果表示中・記録中の状態と採点。
- `domain/vocabulary-presentation.ts`：問題文、答え、例文、日本語訳、読み上げ対象。
- `composables/useVocabularySpeech.ts`：問題変更、回答、ミュート、手動再生の制御。
- `composables/useEnglishSpeech.ts`：画面の破棄時に音声を停止。
- `speech.ts`：ブラウザの音声API、遅延再生、キャンセル。
- `voice-catalog.ts`：音声候補の選別、重複除去、表示分類。
- `components/BaseDialog.vue`：フォーカス移動、背景のinert化、Escape、スクロール制御、フォーカス復帰。
- `stores/actions/`：会話、単語練習、旧会話互換の操作。保存状態の所有者は引き続きappストア。
- `domain/study-statistics.ts`、`domain/study-rewards.ts`：集計、報酬。
- `persistence/`：保存形式の検証、移行、ストレージ操作。

## 維持する動作

答え合わせでは結果を表示し、「次の問題へ」で回答を記録する。カードは自己評価時に記録する。
穴埋め・並び替えは出題時に読み上げず、正誤にかかわらず回答時に完成英文を読む。
ミュートは自動再生にだけ適用し、結果ダイアログの手動再生は可能とする。
旧会話の保存データ、報酬の重複防止、保存形式v7で保存する。

## 例文の採用基準

`exampleInfo` は出典（curated/core/generated）、状態（authored/needs-review）、使用可能な出題形式を持つ。
authoredは手作業で定義されたデータという意味であり、文法検証が自動的に完了したことを意味しない。
自動生成例文はneeds-reviewとし、穴埋め・並び替えの出題には採用しない。選択した単語は除外せず英→日へ切り替える。
学習開始画面にもこの切替条件を表示する。単語帳の既存例文は維持する。

例文を追加・確認する際は、対象単語と意味・品詞・文脈の一致、日本語訳、空欄位置、自然な語順を確認し、
`reorder-examples.ts` または `vocabulary-examples.ts` の手作業で管理する例文へ登録する。
`hasUsableBilingualStructure` は構造のみの検査で、文法や教材品質の判定として使わない。
生成スクリプトも同じ例文解決とメタデータ付与を通す。

## 検証

`npm run check` でLint、書式、データ・保存・画面・音声・ダイアログのテストを実行する。
`npm run build` でTypeScriptと本番ビルドを確認する。PRとデプロイ前のCIでも実行する。
書式チェックはiOSへコピーされたWeb成果物や画像カタログなどの生成物を除外する。
音声の回帰テストはAPI呼び出しを検証し、端末固有の声質や実際の音量は実機で確認する。

## 昇級試験

`domain/promotion-exam.ts` が70%の受験資格、20問の生成、正解の決定を担当する。
`stores/actions/promotion-exam.ts` は試験専用セッションと合否を管理し、通常練習の報酬・実績を更新しない。
受験資格は永続化し、18問以上正解で次レベルを解放する。試験は各レベルを順番に受け、最終レベルには設けない。
試験中は音声・正解を表示せず、結果画面で全回答の確認と手動発音ができる。
試験セッションはメモリ上だけに保持するため、中断・再読み込み時は破棄する。

v6以前からの移行時は学習履歴を保持してレベル1へ再ロックする。
v7以降は連続した合格済みレベルから解放レベルを復元し、履歴30件の上限とは独立して合格状態を保持する。
新規受験資格を練習結果に記録し、通知済み状態でダイアログの再表示を防ぐ。
