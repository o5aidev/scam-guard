// 薄いバックエンドプロキシ（計画 §3 Task2）。
// 役割: ANTHROPIC_API_KEY をサーバ側に隠し、judge.md に従って判定して返すだけ。
// プライバシー最小化（CLAUDE.md §10）: 利用者の本文を永続ログに残さない。
// fail-closed（§7,§10）: 失敗時は緑でなく黄に倒す。

import { judge, JudgeError, type Facts } from "@/lib/judge";
import { FAIL_CLOSED_RESULT } from "@/lib/schema";

// fs で judge.md を読み、Anthropic SDK を使うため Node ランタイムで動かす。
export const runtime = "nodejs";
// 判定は常に最新の入力で行う（キャッシュさせない）。
export const dynamic = "force-dynamic";

interface JudgeRequestBody {
  situation?: unknown;
  facts?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  let body: JudgeRequestBody;
  try {
    body = (await req.json()) as JudgeRequestBody;
  } catch {
    // 壊れた入力でも安全側へ（黄）。本文は無いのでログ不要。
    return Response.json(FAIL_CLOSED_RESULT, { status: 200 });
  }

  const situation = typeof body.situation === "string" ? body.situation : "";
  if (situation.trim() === "") {
    // 空入力はクライアント側で防ぐ前提。明示的に促す。
    return Response.json({ error: "状況を入力してください" }, { status: 400 });
  }

  // facts は任意。型は judge() 側で安全に解釈（未知キーは無視・推測で埋めない）。
  const facts = (body.facts ?? undefined) as Facts | undefined;

  try {
    const result = await judge(situation, facts);
    return Response.json(result, { status: 200 });
  } catch (e) {
    // 本文は出さない。エラー種別のみ記録（プライバシー §10）。
    const detail = e instanceof JudgeError ? e.message : "unknown error";
    console.error("[judge] fail-closed:", detail);
    return Response.json(FAIL_CLOSED_RESULT, { status: 200 });
  }
}
