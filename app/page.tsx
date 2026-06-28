"use client";

import { useState } from "react";
import InputScreen from "@/components/InputScreen";

// 画面遷移：入力 →（Task4で）間 → 結果。
// Task3 時点では入力までを実装し、送信後はプレースホルダを出す。
type Phase = "input" | "submitted";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [situation, setSituation] = useState("");

  function handleSubmit(s: string) {
    setSituation(s);
    setPhase("submitted");
  }

  return (
    <main className="container">
      {phase === "input" && <InputScreen onSubmit={handleSubmit} />}

      {phase === "submitted" && (
        <div>
          <h1 className="app-title">受け取りました</h1>
          <p className="app-sub">
            次のステップ（判定結果の表示）は準備中です。入力内容は次のとおりです。
          </p>
          <div className="sheet-quote">{situation}</div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setPhase("input")}>
              もどる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
