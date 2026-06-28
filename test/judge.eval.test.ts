// ゲート：judge.md を実際に回し、3例で「期待どおりの形・レベル」が返るか検証する。
// LLM 出力は非決定的なので、バイト等価ではなく「不変条件」をアサートする
// （risk / hard_stop / hotline / 発火軸 / スキーマ）。
import { describe, it, expect } from "vitest";
import { judge } from "../lib/judge";
import { validateJudgeResult } from "../lib/schema";

const KEY = process.env.ANTHROPIC_API_KEY ?? "";
const HAS_KEY = !!KEY;
const d = HAS_KEY ? describe : describe.skip;

if (!HAS_KEY) {
  // 鍵が無い環境では実 API 呼び出しをスキップする（DoD: 鍵を設定すれば緑）。
  // 本番は利用者が画面でキーを入れる（BYOK）。テストは env のキーで judge() を直接叩く。
  console.warn(
    "[judge.eval] ANTHROPIC_API_KEY 未設定のため LLM 検証をスキップします。.env に鍵を設定してください。",
  );
}

d("judge.md を3例で検証（不変条件）", () => {
  it("例1: さとり型投資勧誘 → red / hard_stop / 金融サービス利用者相談室", async () => {
    const r = await judge(
      "LINEで知り合った人に、自動売買で月利が出てる、第1期生をコンサルすると言われた。" +
        "実績のスクショは見せてくれたが、検証できるリンクや取引報告書は『シグナルが漏れるから出せない』と断られた。" +
        "今日中に決めれば特別価格と言われている。入金は個人名義の口座。",
      KEY,
      { 金融庁登録: "該当なし", 振込先: "個人名義" },
    );
    expect(validateJudgeResult(r).ok).toBe(true);
    expect(r.risk).toBe("red");
    expect(r.hard_stop).toBe(true);
    expect(r.hotline).toBe("金融サービス利用者相談室");
    // 取り返せない要求と詐称（検証不能な実績）が中核
    expect(r.fired_axes).toContain("要求");
    expect(r.fired_axes).toContain("詐称");
  });

  it("例2: 還付金の電話 → red / hard_stop / 188", async () => {
    const r = await judge(
      "市役所の人から電話で、医療費の還付がある、本日が期限なので近くのATMへ行って操作してくださいと言われた。",
      KEY,
    );
    expect(validateJudgeResult(r).ok).toBe(true);
    expect(r.risk).toBe("red");
    expect(r.hard_stop).toBe(true);
    expect(r.hotline).toBe("188");
  });

  it("例3: 正規っぽい電力会社メール → hard_stop=false かつ green ではない（見逃し回避）", async () => {
    const r = await judge(
      "契約している電力会社を名乗るメールで、今月の請求が確定したとお知らせがあった。" +
        "リンクは押していない。お金や番号は求められていない。",
      KEY,
      { URL評価: "不明" },
    );
    expect(validateJudgeResult(r).ok).toBe(true);
    expect(r.hard_stop).toBe(false);
    // 黄か緑で迷ったら黄に寄せる（judge.md ステップ4）。本物か未確認＝緑にはしない。
    expect(r.risk).not.toBe("green");
  });
});
