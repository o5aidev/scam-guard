// 確認事実の最小抽出（lib/facts.ts）の決定的テスト（API 不要・無課金）。
// judge.md に渡す前処理＝「確信が持てる事実だけ立て、推測で埋めない」を守れているか。
import { describe, it, expect } from "vitest";
import { detectPhoneKind, hasUrl, extractFacts } from "../lib/facts";

describe("detectPhoneKind（電話番号の国際/国内分類）", () => {
  it("+ 始まりは国際", () => {
    expect(detectPhoneKind("着信は +1 415-555-0142 からでした")).toBe("国際");
    expect(detectPhoneKind("＋８１ ９０ １２３４ ５６７８")).toBe("国際"); // 全角も寄せる
  });

  it("010（国際発信プレフィクス）始まりは国際", () => {
    expect(detectPhoneKind("010 1 212 555 0143 に折り返してと言われた")).toBe("国際");
  });

  it("0 始まり10〜11桁は国内", () => {
    expect(detectPhoneKind("03-1234-5678 から電話")).toBe("国内"); // 固定 10桁
    expect(detectPhoneKind("090-1234-5678 にかけ直して")).toBe("国内"); // 携帯 11桁
    expect(detectPhoneKind("0120-000-000 のフリーダイヤル")).toBe("国内");
  });

  it("国際と国内が混在したら強い方（国際）を優先", () => {
    expect(detectPhoneKind("自宅 03-1234-5678 ／ 相手 +44 20 7946 0958")).toBe("国際");
  });

  it("電話番号らしき並びが無ければ undefined（推測で埋めない）", () => {
    expect(detectPhoneKind("還付金があるのでATMへ行ってと言われた")).toBeUndefined();
    expect(detectPhoneKind("2026年6月28日に届いた")).toBeUndefined(); // 日付を誤検出しない
    expect(detectPhoneKind("100万円を振り込んで")).toBeUndefined(); // 金額を誤検出しない
  });

  it("分類できない数字列（口座番号など短い/中途半端な桁）は事実を立てない", () => {
    expect(detectPhoneKind("口座 1234567 に")).toBeUndefined();
  });
});

describe("hasUrl（URL の有無のみ）", () => {
  it("http(s):// を検出", () => {
    expect(hasUrl("ここを確認 https://example.co.jp/login")).toBe(true);
    expect(hasUrl("http://bit.ly/abc を開いて")).toBe(true);
  });

  it("www. ドメインを検出", () => {
    expect(hasUrl("www.example.com にアクセスして")).toBe(true);
  });

  it("メールアドレスや普通の文は URL と誤検出しない", () => {
    expect(hasUrl("support@example.com まで連絡")).toBe(false);
    expect(hasUrl("市役所から電話がありました")).toBe(false);
  });
});

describe("extractFacts（確信が持てる事実だけ詰める）", () => {
  it("国際電話＋URL を両方立てる", () => {
    const f = extractFacts("+1 415-555-0142 から電話、www.example.com を開けと言われた");
    expect(f).toEqual({ 電話番号: "国際", URL評価: "不明" });
  });

  it("URL は『不明』に留める（評価APIは将来＝危険/安全は立てない）", () => {
    expect(extractFacts("https://example.com").URL評価).toBe("不明");
  });

  it("何も確信できなければ空オブジェクト（キーを付けない）", () => {
    expect(extractFacts("家族に相談するなと言われた")).toEqual({});
  });

  it("OCR/音声由来の改行混じりテキストにも効く", () => {
    const ocrLike = "市役所です\n至急 090-1234-5678 まで\nhttps://kuso.example/now";
    expect(extractFacts(ocrLike)).toEqual({ 電話番号: "国内", URL評価: "不明" });
  });
});
