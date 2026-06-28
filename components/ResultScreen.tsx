"use client";

import { useState } from "react";
import type { JudgeResult } from "@/lib/schema";
import {
  RISK_VIEW,
  telHref,
  hotlineLabel,
  primaryHotline,
  buildShareText,
} from "@/lib/contact";

// 3色結果画面（計画 §3 Task4 / CLAUDE.md §7）。
// 大きな3色・理由1〜2文・次の一手は1つだけ・ワンタップ発信・家族共有。
// 緑でも「安全の保証ではない」を必ず添える（偽陰性の害が最大）。

interface Props {
  result: JudgeResult;
  onRestart: () => void;
}

export default function ResultScreen({ result, onRestart }: Props) {
  const view = RISK_VIEW[result.risk];
  const hotline = primaryHotline(result);
  const [shareMsg, setShareMsg] = useState("");

  // 家族へ知らせる。Web Share があれば共有シート、無ければコピーへフォールバック。
  async function shareToFamily() {
    const text = buildShareText(result);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "まもり", text });
      } catch {
        // ユーザがキャンセル／失敗。無理にコピーへ倒さない。
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg("文章をコピーしました。家族に送って、いっしょに確かめてください。");
    } catch {
      setShareMsg("コピーできませんでした。この画面の内容を家族に伝えてください。");
    }
  }

  return (
    <div>
      <div
        className={`risk-banner risk-${view.tone}`}
        role="status"
        aria-live="assertive"
      >
        <span className="risk-emoji" aria-hidden="true">
          {view.emoji}
        </span>
        <span className="risk-word">{view.word}</span>
      </div>

      <p className="result-reason">{result.reason}</p>

      <div className="next-box">
        <div className="next-label">つぎにすること（これだけ）</div>
        <p className="next-action">{result.next_action}</p>
      </div>

      <div className="btn-row">
        {hotline && (
          <a className="btn btn-primary" href={telHref(hotline)}>
            📞 {hotlineLabel(hotline)}に電話
          </a>
        )}
        <button type="button" className="btn btn-secondary" onClick={shareToFamily}>
          👪 家族に知らせる
        </button>
      </div>

      {shareMsg && (
        <p className="status" role="status" aria-live="polite">
          {shareMsg}
        </p>
      )}

      {result.risk === "green" && (
        <p className="green-note">
          これは「安全」の保証ではありません。お金や暗証番号を求められたら、もう一度ここで確かめてください。
        </p>
      )}

      <hr className="divider" />

      <button type="button" className="btn btn-ghost" onClick={onRestart}>
        もう一度しらべる
      </button>
    </div>
  );
}
