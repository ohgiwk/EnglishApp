# 開発資料

## 語彙拡充を再開する

最初は [再開メモ](vocabulary-handoff.md) と `node scripts/vocabulary-status.mjs` だけ確認する。以下は必要なときに参照し、一括で読み込まない。担当分担と作業量の上限は [AGENTS.md](../AGENTS.md) に従う。

| 用途                         | 資料                                                  |
| ---------------------------- | ----------------------------------------------------- |
| 現在位置・次の1件            | [再開メモ](vocabulary-handoff.md)                     |
| レベル・採録・編集基準       | [語彙設計](vocabulary-design.md)                      |
| 語彙JSONの配置・編集方法     | [データREADME](../src/data/vocabulary/README.md)      |
| 最近の完了記録               | [簡易ログ](vocabulary-audit-log.md)（必要な末尾だけ） |
| 照合の注意点・取得失敗の記録 | [参照メモ](vocabulary-audit-reference.md)             |
| 作業中の下書き               | [下書きの運用](drafts/README.md)                      |

[受け入れ条件の監査](vocabulary-acceptance-audit.md)：5,034語の検証と入試照合の根拠。最新仕様では単元選択を廃止し、選択レベル全体から出題する。

## 入試照合資料

`vocabulary/exams/` に問題別の監査と集計を置く。集計は当時のカタログのスナップショットであり、現在の収録語数に自動追従しない。表層形の一致率を理解度・合格可能性と解釈しない。

| 対象               | 資料                                                                                                                      | 範囲・状態                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 共通テスト2025     | [集計](vocabulary/exams/vocabulary-coverage-2025.json)                                                                    | 5,000語時点。公開PDFの抽出可能な本文・設問・選択肢等を含む |
| 慶應2025 第1問     | [監査](vocabulary/exams/vocabulary-audit-keio-2025-q1.md)・[集計](vocabulary/exams/vocabulary-coverage-keio-2025-q1.json) | 本文照合済み。過去の語数での集計                           |
| 慶應2025 第2問     | [監査](vocabulary/exams/vocabulary-audit-keio-2025-q2.md)・[集計](vocabulary/exams/vocabulary-coverage-keio-2025-q2.json) | 本文照合済み。同大学・同年度の別設問                       |
| 九州2025           | [監査](vocabulary/exams/vocabulary-audit-kyushu-2025.md)・[集計](vocabulary/exams/vocabulary-coverage-kyushu-2025.json)   | 本文非公開。公開部分のみの照合                             |
| 大阪公立2024 第1問 | [予備監査](vocabulary/exams/vocabulary-audit-omu-2024-q1.md)                                                              | PDF目視・本文確定・集計は未完了                            |

- [立命館2026年2月4日 第Ⅰ問の監査](vocabulary/exams/vocabulary-audit-ritsumeikan-2026-q1.md)・[集計](vocabulary/exams/vocabulary-coverage-ritsumeikan-2026-q1.json)：5,011語時点の本文8段落。未収録23語と既存6語の別義は反映済み。

- [会津2024 第4問・第2対話の監査](vocabulary/exams/vocabulary-audit-aizu-2024-dialogue2.md)・[集計](vocabulary/exams/vocabulary-coverage-aizu-2024-dialogue2.json)：5,000語時点。対話本文13発言のみを画像確認・転記照合済み。グラフ・設問は対象外。

## 保存資料

`vocabulary/archive/` は通常の再開時には読まない。削除せず、過去の判断や再現条件が必要な場合に対象箇所を検索する。

- [詳細監査履歴](vocabulary/archive/vocabulary-audit-history.md)：以前の判断・参照元。
- [共通テスト初回集計](vocabulary/archive/vocabulary-coverage-2025-1050.json)：1,050語時点の保存版。
- [追加34の旧下書き](vocabulary/archive/vocabulary-add34.txt)：反映済み。再取り込みしない。

新しい問題別資料は `vocabulary/exams/`、反映済み下書きや保存版は `vocabulary/archive/` に置く。進行中の下書きと区別し、移動時にはリンクも更新する。完了記録は簡易ログに1行、現在位置は再開メモで管理し、同じ説明を複製しない。

## その他

- [アプリの学習機能と設計](app-architecture.md)
