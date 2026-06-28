# まもり（scam-guard）

> 相手が誰であっても、詐欺に共通する「構造」を見抜き、**お金が動く前に「立ち止まる一拍」を作る**アプリ。

詐欺の手口を当てるのではなく、手口が違っても変わらない **6軸の不変構造（接触・情動・加速・遮断・要求・詐称）** で判定します。設計思想は [`CLAUDE.md`](./CLAUDE.md)（このプロジェクトの憲法）、判定ロジックの唯一の正は [`prompts/judge.md`](./prompts/judge.md) です。

## 技術スタック

- **Next.js 15 (App Router) + TypeScript** の PWA（高齢者の導入摩擦を最小化）
- 判定は **薄いバックエンド（`app/api/judge`）経由で Claude Sonnet 4.6** を呼ぶ（API キーはサーバ側のみ）
- テスト: **Vitest**
- 端末内 OCR: **tesseract.js**（写真ボタン時のみ動的 import）

## セットアップ

```bash
npm install
cp .env.example .env        # ANTHROPIC_API_KEY を設定
npm run dev                 # http://localhost:3000
```

`.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
JUDGE_MODEL=claude-sonnet-4-6   # 任意。既定は sonnet 4.6
```

## テスト

```bash
npm test                                   # 全件（judge.eval は実APIを叩き課金される）
npx vitest run test/schema.test.ts test/judge.unit.test.ts test/api.route.test.ts   # 決定的分のみ（API不要・無課金）
```

- `test/judge.eval.test.ts` … **ゲート**。judge.md を実際に回し、3例で risk/hard_stop/hotline などの不変条件を検証（`ANTHROPIC_API_KEY` 未設定だと自動スキップ）。
- 決定的テスト … スキーマ・緑ガードレール・防御的 JSON parse・API ルートの fail-closed。

## 構成

```
prompts/judge.md     … 判定エンジン指示書（ロジックの唯一の正。TSで規則を再実装しない）
knowledge/signals.md … 手口カタログ・危険フレーズ・公的窓口（構造を裏打ちする参照コーパス）
CLAUDE.md            … 設計思想・法的ガードレール・高齢者UX原則（憲法）

lib/judge.ts         … judge.md を system 化 → Claude 呼び出し → 防御的 parse → 検証
lib/schema.ts        … JudgeResult の型・検証・緑ガードレール・fail-closed 既定値
lib/ocr.ts           … 端末内 OCR（画像はサーバへ送らない）
app/api/judge/route.ts … 薄いプロキシ（鍵はサーバ側／本文を残さない／失敗時は緑でなく黄）
app/page.tsx         … 画面遷移（入力 →[未実装]間→結果）
components/InputScreen.tsx … 入力1画面（貼る・声・写真 → 状況テキストへ正規化＋送信前確認）
```

## 進捗（引き継ぎ用）

実装計画は「入力1画面 → 間 → 3色結果」の MVP。

- [x] **Task 1** 判定ハーネス＋judge検証テスト（ゲート緑）
- [x] **Task 2** バックエンド判定API（薄いプロキシ・fail-closed）
- [x] **Task 3** 入力1画面（貼る／声／写真OCR・送信前確認）
- [ ] **Task 4** 3色結果画面＋次の一手＋「間」（`app/page.tsx` の `submitted` を本実装へ。`/api/judge` を呼び、🟥🟨🟩・reason・next_action・ワンタップ発信 `tel:188`/`#9110`・家族共有 Web Share・🟩の「保証ではない」一文）
- [ ] **Task 5** 確認事実の最小配線（電話番号の国際/国内・URLの有無）＋ PWA 仕上げ（manifest・アクセシビリティ通し）

## 設計上の厳守事項（CLAUDE.md より）

- 判定ロジックは `judge.md` のみ。TS で判定規則を即興しない。
- 特定の個人・業者を「詐欺だ」と断定しない／投資助言しない／法律事務を代行しない。
- 🟩 は安全の保証ではない一文を必ず添える。判定失敗時は緑でなく黄に倒す（偽陰性の害が最大）。
- 暗証番号・口座番号・パスワードはアプリに保存も入力もさせない。
- 高齢者 UX（16px+・行間1.5+・タッチ44px+・コントラスト4.5:1+・広告/外部リンク無し）を全画面で満たす。
