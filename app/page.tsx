"use client";

import { useEffect, useState } from "react";
import InputScreen from "@/components/InputScreen";
import ResultScreen from "@/components/ResultScreen";
import ApiKeyScreen from "@/components/ApiKeyScreen";
import { FAIL_CLOSED_RESULT, type JudgeResult } from "@/lib/schema";
import { judge, JudgeError } from "@/lib/judge";
import { extractFacts } from "@/lib/facts";
import { loadApiKey } from "@/lib/apiKey";

// 画面遷移：キー設定 →（キーあり）入力 → 間（ま）→ 結果。
// 判定は端末から Anthropic に直接（BYOK）。運営者のサーバを一切経由しない。
type Phase = "input" | "pausing" | "result";

// 「間」を必ず体感させる最小の一拍（CLAUDE.md §7：このアプリの本体は判定精度ではなく、
// お金が動く前に一度立ち止まらせること）。判定が速く返っても、この一拍は置く。
const MIN_PAUSE_MS = 2200;

export default function Home() {
  // null = 未確認（SSR/初期化中）。localStorage は client でしか読めない。
  const [keyReady, setKeyReady] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [keyNotice, setKeyNotice] = useState("");

  useEffect(() => {
    setKeyReady(loadApiKey() !== null);
  }, []);

  async function handleSubmit(situation: string) {
    const key = loadApiKey();
    if (!key) {
      setKeyReady(false);
      return;
    }
    setPhase("pausing");
    // 判定と「最小の間」を並行させる。両方そろってはじめて結果へ進む。
    const pause = new Promise((r) => setTimeout(r, MIN_PAUSE_MS));
    const [out] = await Promise.all([runJudge(situation, key), pause]);

    if (out === "AUTH_ERROR") {
      // キーが正しくない → 設定画面へ戻して直してもらう（黄に倒すより親切で正確）。
      setKeyNotice("APIキーが正しくないようです。もう一度確認して入れてください。");
      setKeyReady(false);
      setPhase("input");
      return;
    }
    setResult(out);
    setPhase("result");
  }

  function restart() {
    setResult(null);
    setPhase("input");
  }

  function openKeySettings() {
    setKeyNotice("");
    setKeyReady(false);
  }

  // 初期化中はチラつき防止に空のまま（キー有無が確定してから描く）。
  if (keyReady === null) return <main className="container" />;

  if (!keyReady) {
    return (
      <main className="container">
        <ApiKeyScreen notice={keyNotice} onSaved={() => { setKeyNotice(""); setKeyReady(true); }} />
      </main>
    );
  }

  return (
    <main className="container">
      {phase === "input" && (
        <>
          <InputScreen onSubmit={handleSubmit} />
          <button type="button" className="link-btn" onClick={openKeySettings}>
            APIキーの設定
          </button>
        </>
      )}
      {phase === "pausing" && <PauseView />}
      {phase === "result" && result && <ResultScreen result={result} onRestart={restart} />}
    </main>
  );
}

// 入力を、利用者のキーで端末から直接判定する。失敗（通信断・形が不正・混雑）は
// 緑でなく黄に倒す（fail-closed・偽陰性の害が最大・CLAUDE.md §7,§10）。
// キー不正だけは別扱いにして、設定画面へ戻すシグナルを返す。
async function runJudge(
  situation: string,
  key: string,
): Promise<JudgeResult | "AUTH_ERROR"> {
  try {
    // 端末内で軽く確認事実（国際/国内の電話番号・URL の有無）を抽出して judge へ渡す。
    // 確信が持てる事実だけが入る＝無ければ undefined 相当（推測で埋めない）。
    return await judge(situation, key, extractFacts(situation));
  } catch (e) {
    if (e instanceof JudgeError && e.kind === "auth") return "AUTH_ERROR";
    return FAIL_CLOSED_RESULT;
  }
}

// 間（ま）：結果の前に置く一拍。お金を動かさないよう、静かに呼吸を促す。
function PauseView() {
  return (
    <div className="pause" role="status" aria-live="polite">
      <div className="pause-ring" aria-hidden="true" />
      <h1 className="pause-title">いったん、ひと呼吸。</h1>
      <p className="pause-sub">お金は、まだ動かさないでください。いま調べています…</p>
    </div>
  );
}
