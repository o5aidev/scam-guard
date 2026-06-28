// 判定ハーネス（ブラウザ実行・BYOK）。
// prompts/judge.md を system プロンプトとして使い、利用者自身のキーで
// Claude を「端末から直接」呼ぶ。判定規則は judge.md が唯一の正。
//
// 方針（このアプリの憲法 §10 / README）:
//   - APIキーは利用者が入力し、端末内だけに置く。運営者のサーバを一切経由しない。
//   - judge.md は fs ではなく生成物（judgePrompt.generated.ts）で同梱する＝端末で完結。
//   - 失敗は JudgeError で投げる。fail-closed の倒し方（黄に倒す）は呼び出し側の責務。

import Anthropic from "@anthropic-ai/sdk";
import { JUDGE_PROMPT } from "./judgePrompt.generated";
import { validateJudgeResult, type JudgeResult } from "./schema";

// 設計書 v1.0 で選んだモデル（利用者が払うため軽量・安定の Sonnet 4.6）。
// opts.model で上書き可。
export const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-6";

// judge.md の「確認事実」に対応（無いこともある。推測で埋めない＝judge.md の指示）。
export interface Facts {
  金融庁登録?: "登録あり" | "警告あり" | "該当なし" | "未照合";
  振込先?: "個人名義" | "法人名義" | "不明";
  電話番号?: "国際" | "国内" | "不明";
  URL評価?: "危険" | "不明" | "安全";
}

// エラーの種類。呼び出し側が「キー画面へ戻す」か「黄に倒す」かを分けられるようにする。
export type JudgeErrorKind = "config" | "auth" | "rate_limit" | "network" | "format";

export class JudgeError extends Error {
  kind: JudgeErrorKind;
  raw?: string;
  constructor(message: string, kind: JudgeErrorKind = "config", raw?: string) {
    super(message);
    this.name = "JudgeError";
    this.kind = kind;
    this.raw = raw;
  }
}

// judge.md は生成物から取る（コードへ焼き込まない＝知識と規則を分離）。
export function loadJudgePrompt(): string {
  return JUDGE_PROMPT;
}

// judge.md の入力ブロックの形に正規化する。状況は必須、確認事実は任意。
export function buildUserMessage(situation: string, facts?: Facts): string {
  const lines: string[] = ["状況:", indent(situation.trim())];
  if (facts && Object.values(facts).some((v) => v != null)) {
    lines.push("", "確認事実:");
    if (facts.金融庁登録) lines.push(`  金融庁登録: ${facts.金融庁登録}`);
    if (facts.振込先) lines.push(`  振込先: ${facts.振込先}`);
    if (facts.電話番号) lines.push(`  電話番号: ${facts.電話番号}`);
    if (facts.URL評価) lines.push(`  URL評価: ${facts.URL評価}`);
  }
  return lines.join("\n");
}

function indent(s: string): string {
  return s
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
}

// LLM が万一コードフェンスや前置きを付けても拾えるよう、最初の JSON オブジェクトを取り出す。
export function extractJson(text: string): string {
  const trimmed = text.trim();
  // ```json ... ``` / ``` ... ``` を剥がす
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  // 最初の { から対応する } までを抜く（前置き・後置きに耐性）
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return body;
  return body.slice(start, end + 1);
}

export interface JudgeOptions {
  model?: string;
  maxTokens?: number;
}

// SDK/HTTP 例外を JudgeError の種類へ写す（呼び出し側の分岐用）。
function classifyError(e: unknown): JudgeError {
  const status =
    e && typeof e === "object" && "status" in e ? (e as { status?: number }).status : undefined;
  if (status === 401 || status === 403) {
    return new JudgeError("APIキーが正しくないか、権限がありません。", "auth");
  }
  if (status === 429) {
    return new JudgeError("いま混み合っています。少し待ってからお試しください。", "rate_limit");
  }
  return new JudgeError("判定サービスに接続できませんでした。", "network");
}

/**
 * 状況（＋任意の確認事実）を、利用者のキーで judge.md に従って判定する。
 * 成功時 JudgeResult を返す。失敗時は種類つきの JudgeError を投げる
 * （fail-closed の倒し方＝黄／キー画面へ戻す、は呼び出し側の責務）。
 */
export async function judge(
  situation: string,
  apiKey: string,
  facts?: Facts,
  opts: JudgeOptions = {},
): Promise<JudgeResult> {
  if (!situation || situation.trim() === "") {
    throw new JudgeError("状況が空です", "config");
  }
  if (!apiKey || apiKey.trim() === "") {
    throw new JudgeError("APIキーが設定されていません", "config");
  }

  const model = opts.model ?? DEFAULT_JUDGE_MODEL;
  // 端末から直接 Anthropic を呼ぶ（運営者のサーバを経由しない）。
  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: 0, // 判定は安定が望ましい
      system: loadJudgePrompt(),
      messages: [{ role: "user", content: buildUserMessage(situation, facts) }],
    });
  } catch (e) {
    throw classifyError(e);
  }

  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new JudgeError("判定の出力を JSON として読めませんでした", "format", raw);
  }

  const validated = validateJudgeResult(parsed);
  if (!validated.ok) throw new JudgeError(`判定の形が不正です: ${validated.error}`, "format", raw);
  return validated.value;
}
