// 判定 API ルートの決定的テスト（LLM を呼ばない経路だけを検証）。
// 成功経路の判定品質は judge.eval.test.ts が担保するので、ここでは
// ルート自身のロジック（入力検証・fail-closed・本文を返す形）に絞る。
import { describe, it, expect } from "vitest";
import { POST } from "../app/api/judge/route";
import { FAIL_CLOSED_RESULT, validateJudgeResult } from "../lib/schema";

function post(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/judge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe("POST /api/judge", () => {
  it("空の状況は 400", async () => {
    const res = await POST(post({ situation: "   " }));
    expect(res.status).toBe(400);
  });

  it("壊れた JSON は fail-closed（黄・200）", async () => {
    const res = await POST(post("これはJSONではない", true));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.risk).toBe("yellow");
    expect(json.hard_stop).toBe(false);
  });

  it("判定が失敗したら緑でなく黄に倒す（鍵未設定で強制エラー）", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const res = await POST(post({ situation: "電話で還付金があると言われた" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.risk).toBe("yellow"); // 決して green に倒さない
      expect(json.hotline).toBe("188");
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });

  it("fail-closed の既定値はスキーマ上正しい", () => {
    expect(validateJudgeResult(FAIL_CLOSED_RESULT).ok).toBe(true);
    expect(FAIL_CLOSED_RESULT.risk).not.toBe("green");
  });
});
