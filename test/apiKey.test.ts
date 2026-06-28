// APIキー形式バリデータの決定的テスト（純関数・localStorage 不要）。
import { describe, it, expect } from "vitest";
import { isLikelyAnthropicKey } from "../lib/apiKey";

describe("isLikelyAnthropicKey（貼り間違いの門番）", () => {
  it("sk-ant- で始まる十分な長さは通す", () => {
    expect(isLikelyAnthropicKey("sk-ant-api03-abcdefghijklmnopqrstuv")).toBe(true);
  });
  it("前後の空白は無視して判定する", () => {
    expect(isLikelyAnthropicKey("  sk-ant-api03-abcdefghijklmnop  ")).toBe(true);
  });
  it("prefix が違えば弾く", () => {
    expect(isLikelyAnthropicKey("sk-1234567890abcdefghijk")).toBe(false);
    expect(isLikelyAnthropicKey("ghp_xxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });
  it("短すぎる/空は弾く", () => {
    expect(isLikelyAnthropicKey("sk-ant-")).toBe(false);
    expect(isLikelyAnthropicKey("")).toBe(false);
    expect(isLikelyAnthropicKey("   ")).toBe(false);
  });
});
