// 結果画面の見せ方と「次の一手」の連絡先（ワンタップ発信・家族共有）。
// 判定規則は judge.md が正。ここは判定済みの結果を「画面の言葉」と
// 「電話/共有の動線」に変換するだけで、危険度を再計算しない（CLAUDE.md §7）。

import type { JudgeResult, Risk, Hotline } from "./schema";

// ── 3色表示（CLAUDE.md §7）。エンジンの risk を高齢者に一瞬で伝わる一語へ圧縮する。
export interface RiskView {
  emoji: string;
  word: string; // 大きく出す合言葉
  tone: "red" | "yellow" | "green"; // CSS クラスのキー
}

export const RISK_VIEW: Record<Risk, RiskView> = {
  red: { emoji: "🟥", word: "あぶない", tone: "red" },
  yellow: { emoji: "🟨", word: "ちょっと待って", tone: "yellow" },
  green: { emoji: "🟩", word: "いまはだいじょうぶ", tone: "green" },
};

// ── 相談先の電話番号と表示名（ワンタップ発信・CLAUDE.md §7）。
// 金融サービス利用者相談室は金融庁の公式窓口（0570-016811）。
interface HotlineInfo {
  tel: string; // tel: の後ろに置く文字列（# は %23 にエンコード）
  label: string; // ボタンに出す名前
}

const HOTLINE_INFO: Record<NonNullable<Hotline>, HotlineInfo> = {
  "188": { tel: "188", label: "消費者ホットライン 188" },
  // tel: では # はフラグメント区切りになるため必ず %23 にエンコードする。
  "#9110": { tel: "%239110", label: "警察相談 #9110" },
  "金融サービス利用者相談室": { tel: "0570-016811", label: "金融サービス利用者相談室" },
};

export function telHref(hotline: NonNullable<Hotline>): string {
  return `tel:${HOTLINE_INFO[hotline].tel}`;
}

export function hotlineLabel(hotline: NonNullable<Hotline>): string {
  return HOTLINE_INFO[hotline].label;
}

// 画面に出す主たる相談先を決める。原則は judge.md が選んだ hotline を尊重する。
// ただし red で万一 hotline が無いときだけ 188 に倒す（赤に必ず電話の出口を残す＝fail-closed）。
// yellow/green の null はそのまま（窓口を無理に出さない＝judge.md の意図を尊重）。
export function primaryHotline(r: JudgeResult): Hotline {
  if (r.hotline) return r.hotline;
  return r.risk === "red" ? "188" : null;
}

// 家族共有のテキスト（軸④「遮断」を破る最強の一手・CLAUDE.md §7,§8）。
// 合言葉・理由・次の一手を含め、緑でも安全の保証でない旨を必ず添える。
export function buildShareText(r: JudgeResult): string {
  const v = RISK_VIEW[r.risk];
  return [
    "【まもり】詐欺かどうか、いっしょに確かめてください",
    `判定：${v.emoji} ${v.word}`,
    `理由：${r.reason}`,
    `つぎにすること：${r.next_action}`,
    "※このアプリは詐欺によくある「形」を調べます。安全の保証ではありません。",
  ].join("\n");
}
