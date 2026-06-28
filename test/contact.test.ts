// 結果画面の連絡動線（発信・共有・3色表示）の決定的テスト（API 不要）。
import { describe, it, expect } from "vitest";
import {
  RISK_VIEW,
  telHref,
  hotlineLabel,
  primaryHotline,
  buildShareText,
} from "../lib/contact";
import type { JudgeResult } from "../lib/schema";

function mk(over: Partial<JudgeResult>): JudgeResult {
  return {
    risk: "yellow",
    hard_stop: false,
    fired_axes: [],
    reason: "理由です。",
    next_action: "次の一手です。",
    hotline: null,
    ...over,
  };
}

describe("telHref（ワンタップ発信）", () => {
  it("188 はそのまま", () => {
    expect(telHref("188")).toBe("tel:188");
  });
  it("#9110 は # を %23 にエンコードする", () => {
    expect(telHref("#9110")).toBe("tel:%239110");
  });
  it("金融サービス利用者相談室 は公式番号に繋ぐ", () => {
    expect(telHref("金融サービス利用者相談室")).toBe("tel:0570-016811");
  });
});

describe("hotlineLabel", () => {
  it("どの窓口にも人が読める名前がある", () => {
    expect(hotlineLabel("188")).toContain("188");
    expect(hotlineLabel("#9110")).toContain("#9110");
    expect(hotlineLabel("金融サービス利用者相談室")).toBe("金融サービス利用者相談室");
  });
});

describe("primaryHotline", () => {
  it("judge が選んだ窓口を尊重する", () => {
    expect(primaryHotline(mk({ hotline: "#9110" }))).toBe("#9110");
    expect(primaryHotline(mk({ hotline: "金融サービス利用者相談室" }))).toBe(
      "金融サービス利用者相談室",
    );
  });
  it("red で hotline が無ければ 188 に倒す（赤に電話の出口を残す）", () => {
    expect(primaryHotline(mk({ risk: "red", hotline: null }))).toBe("188");
  });
  it("yellow / green の null はそのまま（窓口を無理に出さない）", () => {
    expect(primaryHotline(mk({ risk: "yellow", hotline: null }))).toBe(null);
    expect(primaryHotline(mk({ risk: "green", hotline: null }))).toBe(null);
  });
});

describe("RISK_VIEW（3色の合言葉）", () => {
  it("3色すべてに絵文字と合言葉がある", () => {
    expect(RISK_VIEW.red).toMatchObject({ emoji: "🟥", word: "あぶない", tone: "red" });
    expect(RISK_VIEW.yellow).toMatchObject({ word: "ちょっと待って", tone: "yellow" });
    expect(RISK_VIEW.green).toMatchObject({ word: "いまはだいじょうぶ", tone: "green" });
  });
});

describe("buildShareText（家族共有・軸④遮断を破る）", () => {
  it("合言葉・理由・次の一手・非保証を含む", () => {
    const t = buildShareText(
      mk({ risk: "red", reason: "急かしています", next_action: "電話を切って" }),
    );
    expect(t).toContain("あぶない");
    expect(t).toContain("急かしています");
    expect(t).toContain("電話を切って");
    expect(t).toContain("保証ではありません");
  });
});
