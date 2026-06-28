"use client";

import { useState } from "react";
import { isLikelyAnthropicKey, saveApiKey, loadApiKey, clearApiKey } from "@/lib/apiKey";

// APIキー設定画面（BYOK）。
// このアプリは利用者自身のキーで動く。キーは端末内だけに保存し、運営者は受け取らない。
// 判定の入口（InputScreen）の手前で、キーが無いとき／変更したいときに出す。

interface Props {
  onSaved: () => void;
  notice?: string; // 例: キーが弾かれて戻ってきたときの案内
}

// キー取得先（公式コンソール）。詐欺チェック本編は外部リンクを置かない方針だが、
// この設定画面だけは BYOK のため公式リンクを許容する（憲法 §9 の明記済み例外）。
const CONSOLE_URL = "https://console.anthropic.com/settings/keys";

export default function ApiKeyScreen({ onSaved, notice }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const hasExisting = loadApiKey() !== null;

  function save() {
    const k = key.trim();
    if (!isLikelyAnthropicKey(k)) {
      setError("キーの形が違うようです。「sk-ant-」で始まる文字列を貼り付けてください。");
      return;
    }
    setError("");
    saveApiKey(k);
    onSaved();
  }

  function removeKey() {
    clearApiKey();
    setKey("");
    setError("");
    // 保存済みキーを消したら、画面はそのまま（入力待ち）にする。
    setShow(false);
  }

  return (
    <div>
      <h1 className="app-title">まもり</h1>
      <p className="app-sub">はじめに、判定に使う「APIキー」を1回だけ入れてください。</p>

      {notice && (
        <p className="status" role="alert" aria-live="assertive">
          {notice}
        </p>
      )}

      <div className="note">
        <p>
          このアプリは、あなたの<strong>キーで直接</strong>判定します。キーも相談内容も、
          <strong>この端末の中だけ</strong>に置かれ、運営者には送られません・見られません。
        </p>
        <p>判定のときだけ、あなたの入力はあなたのキーで Anthropic に直接送られます。</p>
      </div>

      <label className="label" htmlFor="apikey">
        APIキー（sk-ant-… で始まる文字列）
      </label>
      <div className="key-row">
        <input
          id="apikey"
          className="input"
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-describedby="apikey-hint"
        />
        <button
          type="button"
          className="btn btn-ghost key-toggle"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
        >
          {show ? "かくす" : "見る"}
        </button>
      </div>
      <p id="apikey-hint" className="hint">
        キーは Anthropic の公式サイトで作れます：
        <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
          console.anthropic.com
        </a>
      </p>

      {error && (
        <p className="status" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      <button type="button" className="btn btn-primary" onClick={save}>
        このキーで始める
      </button>

      {hasExisting && (
        <button type="button" className="btn btn-ghost" onClick={removeKey}>
          保存されているキーを消す
        </button>
      )}
    </div>
  );
}
