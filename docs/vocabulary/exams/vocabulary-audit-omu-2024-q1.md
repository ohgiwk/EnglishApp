# 大阪公立大学2024年度・前期英語第1問：予備監査

実施日: 2026-10-05。照合対象カタログ: 3,000語。**候補抽出済み、本文の目視照合と語数集計は未完了**。

## 出典と対象

[大学公式PDF](https://www.omu.ac.jp/admissions/assets/24zen4_English.pdf)の第1問、冊子印刷ページ2〜4（PDFの4〜6ページ）。手書きのノートと学習・認知を扱う本文。原出典はHetty Roessingh、The Conversation、2020-08-31（入試では一部省略・改変）。第2問は本文が非公開なので対象外。

Web取得のテキストで本文と設問の境界を確認した。予定する集計範囲は本文のみ。日本語指示、語注、出典、選択肢、ページ番号を除き、空所は補完しない。本文内の語注対象語は残す。行末のハイフンや制御文字はPDFの見た目と照合してから処理する。

直接取得は通常接続・IPv4の2回とも接続タイムアウト（curl終了コード28）。Webの画像取得でもこの環境では閲覧可能な画像が返らず、目視確認できていない。全本文の確定版・ハッシュ・トークン集計はまだ作成していない。抽出結果だけから正確な一致率を主張しない。

## 追加候補

次の24見出しは大文字小文字を区別せず3,000語全件と照合し未収録。本文の活用形・派生形から基本形へ戻した候補を含む。入試頻度順ではない。語義・例文・レベルの編集は追加時に行う。

| 領域               | 優先候補                                                            |
| ------------------ | ------------------------------------------------------------------- |
| 学習の動作         | summarize, paraphrase, manipulate, embody, theorize, spark          |
| 学習の過程・道具   | retrieval, engagement, reflection, template, format, documentation  |
| 読解での評価・描写 | robust, authentic, inventive, meticulous, indispensable, solely     |
| 認知・説明         | observational, purposeful, pioneer, neuroscience, tactile, verbatim |

注のある語も含むため、「自力で意味を知ることが解答に必須の24語」とは扱わない。残る候補にはpicky、encrypt、ingrain、legibility、cursive、unparalleledなどがある。automaticityやneurocircuitryなど専門性の高い語は優先度を別途判断する。

## 重複・水増しを避ける確認

- sustainedはsustain（v1655）へ対応させ、単なる活用形として追加しない。
- allocatingはallocate（v1990）、consolidatedはconsolidate（v2732）、transformingはtransform（v1670）へ対応する。
- observationsは既存名詞observation（v1323）の複数形。observe（v1236）の活用形とは扱わない。
- documentingはdocument（v1959）へ対応。動詞の別義も既存データにあり、新規見出しの追加は不要。
- cognition（v1823）、cognitive（v2006）、fluency（v2382）、literacy（v1841）、curriculum（v1844）、insight（v1834）は収録済み。
- summarize/summarise、theorize/theoriseはいずれの綴りも未収録。英米の綴り違いを別見出しとして増やさない。

## 取得の再確認

2026-10-05夜、直接取得を接続10秒・全体20秒で再試行したが接続タイムアウト。アプリ内ブラウザーもPDFへの移動・状態取得がタイムアウトした。本文を目視できたとは扱わない。新しい取得手段や接続状態の変化がない限り同じ取得を毎回繰り返さない。

代替候補も確認した。名古屋大学公式の2024年リンク先 `https://www.nagoya-u.ac.jp/admissions/exam/data/answer/sub/6_1.html` は404。名古屋市立大学の[2024前期英語公式PDF](https://www.nagoya-cu.ac.jp/media/R6_zenki_english01.pdf)は第1〜3問の本文が著作権上非掲載のため、本文照合の代替には使わない。設問・語注のみの一致率を本文網羅率として集計しない。

## 追加への反映

2026-10-05、優先24候補を追加41のv3001〜v3024へ反映した。残る候補のうちpicky、encrypt、ingrain、legibility、cursive、unparalleledも同じ回で追加。例文は独自編集。本文監査の未完了状態は変わらない。

## 次の処理

残る候補は学習価値を判断して追加を検討する。本文監査の完了には、公開PDFの目視確認、本文だけの抽出、ハッシュ保存、既定の表記一致集計が必要。独立した二重照合は未実施。今回の予備確認を「別大学・年度の本文監査完了」と数えない。
