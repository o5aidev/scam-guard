// スキーマと緑ガードレールの決定的テスト（API 不要）。
import { describe, it, expect } from "vitest";
import { validateJudgeResult, greenDisclaimerPresent } from "../lib/schema";

const valid = {
  risk: "red",
  hard_stop: true,
  fired_axes: ["加速", "遮断", "要求"],
  reason: "急かして、相談させず、個人名義の口座に振り込ませようとしています。",
  next_action: "いますぐ家族か188に電話を。お金は振り込まないでください。",
  hotline: "188",
};

describe("validateJudgeResult", () => {
  it("正しい形を通す", () => {
    const r = validateJudgeResult(valid);
    expect(r.ok).toBe(true);
  });

  it("risk が不正なら弾く", () => {
    expect(validateJudgeResult({ ...valid, risk: "ろん" }).ok).toBe(false);
  });

  it("hard_stop が真偽値でなければ弾く", () => {
    expect(validateJudgeResult({ ...valid, hard_stop: "true" }).ok).toBe(false);
  });

  it("未知の軸名を弾く", () => {
    expect(validateJudgeResult({ ...valid, fired_axes: ["接触", "謎"] }).ok).toBe(false);
  });

  it("hotline は許可値か null のみ", () => {
    expect(validateJudgeResult({ ...valid, hotline: null }).ok).toBe(true);
    expect(validateJudgeResult({ ...valid, hotline: "110" }).ok).toBe(false);
  });

  it("reason / next_action の空を弾く", () => {
    expect(validateJudgeResult({ ...valid, reason: "  " }).ok).toBe(false);
    expect(validateJudgeResult({ ...valid, next_action: "" }).ok).toBe(false);
  });

  it("オブジェクト以外を弾く", () => {
    expect(validateJudgeResult(null).ok).toBe(false);
    expect(validateJudgeResult("{}").ok).toBe(false);
    expect(validateJudgeResult([valid]).ok).toBe(false);
  });
});

describe("緑ガードレール（保証ではない一文）", () => {
  const green = {
    risk: "green",
    hard_stop: false,
    fired_axes: [],
    reason: "いまのところ危ない形は見えません。",
    next_action: "ただし安全の保証ではありません。お金を求められたらもう一度確認を。",
    hotline: null,
  };

  it("green で『保証ではない』があれば通す", () => {
    expect(greenDisclaimerPresent(green as never)).toBe(true);
    expect(validateJudgeResult(green).ok).toBe(true);
  });

  it("green で『保証ではない』が無ければ弾く", () => {
    const bad = { ...green, next_action: "いまはだいじょうぶです。" };
    expect(validateJudgeResult(bad).ok).toBe(false);
  });

  it("green 以外はガードレール対象外", () => {
    expect(greenDisclaimerPresent(valid as never)).toBe(true);
  });
});
