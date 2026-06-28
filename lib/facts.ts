// 確認事実の最小抽出（端末内・純関数・推測で埋めない）。
//
// 方針（CLAUDE.md §6 / judge.md「確認事実」/ README Task5）:
//   - judge.md が唯一の判定者。ここは「外部で調べた事実」を judge に渡すための
//     軽い前処理であって、判定規則を TS で再実装しない。
//   - 確信が持てる事実だけを立てる。分からない項目は **付けない**（推測で埋めない）。
//   - 端末内で完結（外部送信なし）。OCR・音声で得たテキストにも同じく効く。
//
// いま立てられる事実は2つだけ:
//   電話番号: 国際 / 国内    … 本文中の電話番号らしき並びから判定
//   URL評価:  不明           … 本文に URL があれば「有無のみ」立てる（評価APIは将来）
// 振込先・金融庁登録は外部照合が要るためここでは扱わない（将来）。

import type { Facts } from "./judge";

// 全角数字・全角＋・全角ハイフンを半角へ寄せてから走査する
// （高齢者がコピペする SMS には全角が混ざりやすい）。
function toHalfWidth(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/＋/g, "+")
    .replace(/[－ー―‐]/g, "-");
}

// 電話番号らしき並び（+・数字・区切り）を拾う。最低でも数字7桁相当の長さを要求し、
// 日付や金額の短い数字を誤検出しないようにする。
const PHONE_TOKEN = /\+?\d[\d()\-.\s]{5,}\d/g;

/**
 * 本文中の電話番号らしき並びを、国際 / 国内 に分類する。
 * - 先頭が「+」、または国際発信プレフィクス「010」で始まる → 国際（最も強い信号）。
 *   ※特殊詐欺に使われた番号の半数超が国際電話という調査がある（knowledge/signals.md）。
 * - 「0」始まりで桁数が日本の電話番号相当（10〜11桁）→ 国内。
 * - どちらとも言い切れない並び（口座番号など）は分類しない＝事実を立てない。
 * 国際と国内が両方あれば、より強い信号の「国際」を優先する。
 */
export function detectPhoneKind(text: string): "国際" | "国内" | undefined {
  const norm = toHalfWidth(text);
  const tokens = norm.match(PHONE_TOKEN) ?? [];
  let domestic = false;
  for (const tok of tokens) {
    const hasPlus = tok.trimStart().startsWith("+");
    const digits = tok.replace(/\D/g, "");
    // 「+国番号…」は国際。国番号＋番号で最低7桁は要る。
    if (hasPlus && digits.length >= 7) return "国際";
    // 「010」は日本からの国際発信プレフィクス。後続に国番号＋番号が続く。
    if (digits.startsWith("010") && digits.length >= 8) return "国際";
    // 日本の固定/携帯/IP/フリーダイヤルは 0 始まりで 10〜11 桁。
    if (digits.startsWith("0") && (digits.length === 10 || digits.length === 11)) {
      domestic = true;
    }
  }
  return domestic ? "国内" : undefined;
}

// 本文に URL があるか。http(s):// または www. のドメインのみを URL とみなす
// （メールアドレスや無印のファイル名を URL と誤検出しないための保守的な判定）。
const URL_SCHEME = /https?:\/\/\S+/i;
const URL_WWW = /(^|[^\w@])www\.[a-z0-9-]+\.[a-z]{2,}/i;

export function hasUrl(text: string): boolean {
  return URL_SCHEME.test(text) || URL_WWW.test(text);
}

/**
 * 状況テキストから、確信が持てる確認事実だけを抽出する。
 * 立てられない項目はキー自体を付けない（judge.md「想像で補わない」と整合）。
 */
export function extractFacts(text: string): Facts {
  const facts: Facts = {};
  const phone = detectPhoneKind(text);
  if (phone) facts.電話番号 = phone;
  // URL は「有無のみ」。評価APIは将来なので、危険/安全は立てず「不明」に留める。
  if (hasUrl(text)) facts.URL評価 = "不明";
  return facts;
}
