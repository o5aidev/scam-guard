// prompts/judge.md を、ブラウザへ運べる TS 文字列へ生成する。
// 理由: BYOK・無バックエンド方式では fs で judge.md を読めない（端末で完結）。
// 線引き: 判定ロジックの唯一の正は prompts/judge.md のまま。これはその「運び屋」。
// 実行: npm run build-prompt（predev/prebuild/pretest で自動実行）。

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const md = readFileSync(join(root, "prompts", "judge.md"), "utf8");

const banner =
  "// GENERATED — 編集しない。源泉: prompts/judge.md（生成: npm run build-prompt）\n" +
  "// 判定ロジックの唯一の正は prompts/judge.md。ここはそれをブラウザへ運ぶための生成物。\n";
const body = `export const JUDGE_PROMPT = ${JSON.stringify(md)};\n`;

writeFileSync(join(root, "lib", "judgePrompt.generated.ts"), banner + body);
console.log("generated lib/judgePrompt.generated.ts from prompts/judge.md");
