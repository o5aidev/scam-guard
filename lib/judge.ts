// 判定ハーネス（UI 非依存・サーバ側）。
// prompts/judge.md を system プロンプトとして読み、Claude Sonnet 4.6 を呼んで JudgeResult を得る。
// 判定規則は judge.md が唯一の正。ここはその指示書を「運ぶ」だけで、規則を足さない。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { validateJudgeResult, type JudgeResult } from "./schema";

export const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-6";

// judge.md の「確認事実」に対応（無いこともある。推測で埋めない＝judge.md の指示）。
export interface Facts {
  金融庁登録?: "登録あり" | "警告あり" | "該当なし" | "未照合";
  振込先?: "個人名義" | "法人名義" | "不明";
  電話番号?: "国際" | "国内" | "不明";
  URL評価?: "危険" | "不明" | "安全";
}

export class JudgeError extends Error {
  raw?: string;
  constructor(message: string, raw?: string) {
    super(message);
    this.name = "JudgeError";
    this.raw = raw;
  }
}

// judge.md は実行時に読む（コードへ焼き込まない＝知識と規則を分離）。
let cachedSystemPrompt: string | null = null;

export function loadJudgePrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const here = dirname(fileURLToPath(import.meta.url));
  // lib/ から見たリポジトリ直下の prompts/judge.md
  const path = join(here, "..", "prompts", "judge.md");
  cachedSystemPrompt = readFileSync(path, "utf8");
  return cachedSystemPrompt;
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
  apiKey?: string;
  maxTokens?: number;
}

/**
 * 状況（＋任意の確認事実）を judge.md に従って判定する。
 * 成功時 JudgeResult を返す。API/parse/検証失敗時は JudgeError を投げる
 * （fail-closed の倒し方は呼び出し側の責務＝計画 §3 Task2）。
 */
export async function judge(
  situation: string,
  facts?: Facts,
  opts: JudgeOptions = {},
): Promise<JudgeResult> {
  if (!situation || situation.trim() === "") {
    throw new JudgeError("状況が空です");
  }
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new JudgeError("ANTHROPIC_API_KEY が未設定です");

  const model = opts.model ?? process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: 0, // 判定は安定が望ましい
    system: loadJudgePrompt(),
    messages: [{ role: "user", content: buildUserMessage(situation, facts) }],
  });

  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new JudgeError("判定の出力を JSON として読めませんでした", raw);
  }

  const validated = validateJudgeResult(parsed);
  if (!validated.ok) throw new JudgeError(`判定の形が不正です: ${validated.error}`, raw);
  return validated.value;
}
