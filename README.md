# まもり（scam-guard）

> 相手が誰であっても、詐欺に共通する「構造」を見抜き、**お金が動く前に「立ち止まる一拍」を作る**アプリ。

詐欺の手口を当てるのではなく、手口が違っても変わらない **6軸の不変構造（接触・情動・加速・遮断・要求・詐称）** で判定します。設計思想は [`CLAUDE.md`](./CLAUDE.md)（このプロジェクトの憲法）、判定ロジックの唯一の正は [`prompts/judge.md`](./prompts/judge.md) です。

## 技術スタック

- **Next.js 15 (App Router) + TypeScript** の PWA（高齢者の導入摩擦を最小化）。バックエンド無し＝**静的ホスティング可**。
- 判定は **利用者自身のキーで、端末のブラウザから Claude Sonnet 4.6 を直接呼ぶ（BYOK）**。運営者のサーバを一切経由しない。
- テスト: **Vitest**
- 端末内 OCR: **tesseract.js**（写真ボタン時のみ動的 import）

### プライバシー方針（オープンソース・ローカル駆動）

- **APIキーは利用者が入れる**。キーは**この端末の localStorage だけ**に保存され、運営者には送られません。
- **相談内容も運営者は受け取りません**。判定のときだけ、入力は**利用者のキーで Anthropic に直接**送られます（送り先は Anthropic であって運営者ではない）。
- バックエンドが無い＝**運営者側にログは存在しません**。収集も保存もしません。
- 端末内で完結するもの: 写真OCR・音声認識・キー保存。Anthropic に出るもの: 最終的な「状況テキスト」＋利用者のキーのみ。

## セットアップ

```bash
npm install
npm run dev                 # http://localhost:3000
```

`.env` は不要です。**APIキーは起動後、画面で入力**します（「sk-ant-…」で始まる文字列。Anthropic の公式コンソールで作成）。

> `prompts/judge.md` は `npm run dev`/`build`/`test` の直前に `lib/judgePrompt.generated.ts` へ自動生成され、ブラウザへ同梱されます（判定ロジックの唯一の正は judge.md のまま）。

## テスト

```bash
npm test                                   # 全件（judge.eval は実APIを叩き課金される）
npx vitest run test/schema.test.ts test/judge.unit.test.ts test/contact.test.ts test/apiKey.test.ts   # 決定的分のみ（API不要・無課金）
```

- `test/judge.eval.test.ts` … **ゲート**。judge.md を実際に回し、3例で risk/hard_stop/hotline などの不変条件を検証。`ANTHROPIC_API_KEY` 未設定だと自動スキップ。**この env キーはこのテスト専用**（アプリ本体は BYOK で、env キーは使いません）。
- 決定的テスト … スキーマ・緑ガードレール・防御的 JSON parse・キー形式バリデータ・結果画面の連絡動線。

## 構成

```
prompts/judge.md     … 判定エンジン指示書（ロジックの唯一の正。TSで規則を再実装しない）
knowledge/signals.md … 手口カタログ・危険フレーズ・公的窓口（構造を裏打ちする参照コーパス）
CLAUDE.md            … 設計思想・法的ガードレール・高齢者UX原則（憲法）

scripts/gen-prompt.mjs … judge.md → lib/judgePrompt.generated.ts を生成（端末同梱用・pre フックで自動）
lib/judge.ts         … 利用者のキーで端末から Claude を直接呼ぶ（BYOK・dangerouslyAllowBrowser）→ 防御的 parse → 検証
lib/schema.ts        … JudgeResult の型・検証・緑ガードレール・fail-closed 既定値
lib/apiKey.ts        … APIキーの保管（localStorage・端末内のみ）＋形式バリデータ
lib/ocr.ts           … 端末内 OCR（画像はサーバへ送らない）
lib/contact.ts       … 結果の見せ方（3色の合言葉）と次の一手の動線（発信 tel:・家族共有テキスト）
app/page.tsx         … 画面遷移（キー設定 → 入力 → 間（ま）→ 結果）。judge() を直接呼び fail-closed で黄に倒す
components/ApiKeyScreen.tsx … APIキー設定（BYOK・端末内保存の説明・表示切替・削除・公式コンソールへの導線）
components/InputScreen.tsx … 入力1画面（貼る・声・写真 → 状況テキストへ正規化＋送信前確認）
components/ResultScreen.tsx … 3色結果＋理由＋次の一手1つ＋ワンタップ発信＋家族共有＋🟩の非保証一文
```

> バックエンド（`app/api/judge`）は廃止しました。判定は端末から Anthropic に直接行きます（BYOK・運営者を経由しない）。

## 進捗（引き継ぎ用）

実装計画は「入力1画面 → 間 → 3色結果」の MVP。

- [x] **Task 1** 判定ハーネス＋judge検証テスト（ゲート緑）
- [x] ~~**Task 2** バックエンド判定API（薄いプロキシ）~~ → **BYOK 直接方式へ移行して廃止**（運営者がキー・内容を持たない／ログを残さないため。`app/api/judge` 削除）
- [x] **Task 3** 入力1画面（貼る／声／写真OCR・送信前確認）
- [x] **Task 4** 3色結果画面＋次の一手＋「間」（入力 → 間（最小2.2sの一拍） → 結果。judge() を直接呼び fail-closed で黄に倒す。🟥🟨🟩・reason・next_action（1つだけ）・ワンタップ発信 `tel:188`/`tel:%239110`/金融サービス利用者相談室・家族共有 Web Share（非対応はコピー）・🟩の「保証ではない」一文）
- [x] **BYOK 化** APIキーは利用者が画面で入力・端末内保存。判定は端末から Anthropic に直接（運営者を経由しない）。auth エラーはキー画面へ戻す。
- [ ] **Task 5** 確認事実の最小配線（電話番号の国際/国内・URLの有無）＋ PWA 仕上げ（manifest・アクセシビリティ通し）

## 設計上の厳守事項（CLAUDE.md より）

- 判定ロジックは `judge.md` のみ。TS で判定規則を即興しない。
- 特定の個人・業者を「詐欺だ」と断定しない／投資助言しない／法律事務を代行しない。
- 🟩 は安全の保証ではない一文を必ず添える。判定失敗時は緑でなく黄に倒す（偽陰性の害が最大）。
- 暗証番号・口座番号・パスワードはアプリに保存も入力もさせない（APIキーは利用者自身のもので、端末内のみ・運営者は受け取らない＝この制約の対象外）。
- 運営者は相談内容・キーを受け取らず・ログも持たない（バックエンド無し）。判定の送り先は Anthropic であって運営者ではない、という線引きを画面と本READMEに明記する。
- 高齢者 UX（16px+・行間1.5+・タッチ44px+・コントラスト4.5:1+・広告/外部リンク無し）を全画面で満たす。**例外**: APIキー設定画面のみ、キー取得のため Anthropic 公式コンソールへのリンクを許容する（詐欺チェック本編には外部リンクを置かない）。
