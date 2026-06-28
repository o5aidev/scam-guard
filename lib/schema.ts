// judge.md が返す JSON の型と検証。
// judge ロジックの正は prompts/judge.md。ここは「形」を守る門番であって、
// 判定規則そのものを TS で再実装しない（CLAUDE.md §6・計画 §6）。

export const RISK = ["red", "yellow", "green"] as const;
export type Risk = (typeof RISK)[number];

// 6軸の正規名（judge.md の出力に合わせる）
export const AXES = ["接触", "情動", "加速", "遮断", "要求", "詐称"] as const;
export type Axis = (typeof AXES)[number];

// 相談先（judge.md の出力に合わせる）。null は窓口不要（主に green）。
export const HOTLINES = ["188", "#9110", "金融サービス利用者相談室"] as const;
export type Hotline = (typeof HOTLINES)[number] | null;

export interface JudgeResult {
  risk: Risk;
  hard_stop: boolean;
  fired_axes: Axis[];
  reason: string;
  next_action: string;
  hotline: Hotline;
}

export type ValidateResult =
  | { ok: true; value: JudgeResult }
  | { ok: false; error: string };

// green のとき「安全の保証ではない」を必ず添える（CLAUDE.md §7,§10 / judge.md 絶対ルール4）。
// 表現ゆれを許容しつつ、緑が免罪符にならないことを構造的に担保する。
const GREEN_DISCLAIMER_HINTS = ["保証ではありません", "保証ではない", "保証でない"];

export function greenDisclaimerPresent(r: JudgeResult): boolean {
  if (r.risk !== "green") return true; // 緑以外は対象外
  const text = `${r.reason} ${r.next_action}`;
  return GREEN_DISCLAIMER_HINTS.some((h) => text.includes(h));
}

// fail-closed の既定値（計画 §3 Task2 / CLAUDE.md §7,§10）。
// 判定に失敗したら緑に倒さず黄に倒し、立ち止まりと相談へ促す（偽陰性の害が最大）。
export const FAIL_CLOSED_RESULT: JudgeResult = {
  risk: "yellow",
  hard_stop: false,
  fired_axes: [],
  reason: "うまく判定できませんでした。安全のため、いったん立ち止まってください。",
  next_action: "お金や番号は教えず、家族か188に電話して相談してください。",
  hotline: "188",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * 任意の値（LLM 出力を parse したもの）を JudgeResult として検証する。
 * 形が崩れていれば ok:false を返す（例外は投げない）。
 */
export function validateJudgeResult(input: unknown): ValidateResult {
  if (!isPlainObject(input)) return { ok: false, error: "出力がオブジェクトではありません" };

  const { risk, hard_stop, fired_axes, reason, next_action, hotline } = input;

  if (typeof risk !== "string" || !(RISK as readonly string[]).includes(risk)) {
    return { ok: false, error: `risk が不正: ${JSON.stringify(risk)}` };
  }
  if (typeof hard_stop !== "boolean") {
    return { ok: false, error: `hard_stop が真偽値ではありません: ${JSON.stringify(hard_stop)}` };
  }
  if (
    !Array.isArray(fired_axes) ||
    !fired_axes.every((a) => typeof a === "string" && (AXES as readonly string[]).includes(a))
  ) {
    return { ok: false, error: `fired_axes が不正: ${JSON.stringify(fired_axes)}` };
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    return { ok: false, error: "reason が空です" };
  }
  if (typeof next_action !== "string" || next_action.trim() === "") {
    return { ok: false, error: "next_action が空です" };
  }
  const hotlineOk =
    hotline === null || (typeof hotline === "string" && (HOTLINES as readonly string[]).includes(hotline));
  if (!hotlineOk) {
    return { ok: false, error: `hotline が不正: ${JSON.stringify(hotline)}` };
  }

  const value: JudgeResult = {
    risk: risk as Risk,
    hard_stop,
    fired_axes: fired_axes as Axis[],
    reason,
    next_action,
    hotline: hotline as Hotline,
  };

  if (!greenDisclaimerPresent(value)) {
    return { ok: false, error: "green なのに『保証ではない』旨が reason/next_action にありません" };
  }

  return { ok: true, value };
}
