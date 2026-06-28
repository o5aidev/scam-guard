// 純関数の決定的テスト（API 不要）：コードフェンス剥がしと入力整形。
import { describe, it, expect } from "vitest";
import { extractJson, buildUserMessage, loadJudgePrompt } from "../lib/judge";

describe("extractJson（防御的 parse）", () => {
  it("そのままの JSON", () => {
    expect(extractJson('{"risk":"red"}')).toBe('{"risk":"red"}');
  });
  it("```json フェンスを剥がす", () => {
    const t = "```json\n{\"risk\":\"green\"}\n```";
    expect(JSON.parse(extractJson(t)).risk).toBe("green");
  });
  it("前置き・後置きがあっても最初のオブジェクトを抜く", () => {
    const t = 'はい、結果です:\n{"risk":"yellow"}\nご確認ください。';
    expect(JSON.parse(extractJson(t)).risk).toBe("yellow");
  });
});

describe("buildUserMessage", () => {
  it("状況のみ（確認事実なし）", () => {
    const m = buildUserMessage("電話で還付金と言われた");
    expect(m).toContain("状況:");
    expect(m).toContain("電話で還付金と言われた");
    expect(m).not.toContain("確認事実:");
  });
  it("確認事実があれば付ける", () => {
    const m = buildUserMessage("投資の勧誘", { 振込先: "個人名義", 金融庁登録: "該当なし" });
    expect(m).toContain("確認事実:");
    expect(m).toContain("振込先: 個人名義");
    expect(m).toContain("金融庁登録: 該当なし");
  });
});

describe("loadJudgePrompt", () => {
  it("judge.md を読み込める", () => {
    const p = loadJudgePrompt();
    expect(p).toContain("判定エンジン指示書");
    expect(p).toContain("JSONだけを出力");
  });
});
