"use client";

import { useEffect, useRef, useState } from "react";
import { ocrImage } from "@/lib/ocr";

// 入力1画面（計画 §3 Task3）。
// 貼る／書く・声・写真 のどれでも、最終的に1本の「状況」テキストに正規化して
// onSubmit に渡す。送信前に必ず確認の一拍を置く（CLAUDE.md §9）。

interface Props {
  onSubmit: (situation: string) => void;
  busy?: boolean;
}

export default function InputScreen({ onSubmit, busy = false }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const baseTextRef = useRef(""); // 音声認識開始時の本文（追記の基点）

  useEffect(() => {
    return () => recogRef.current?.abort();
  }, []);

  function appendText(chunk: string) {
    const t = chunk.trim();
    if (!t) return;
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${t}` : t));
  }

  // ---- 声で話す（Web Speech API） ----
  function toggleVoice() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("この端末では音声入力が使えません。文字で入れるか、写真を使ってください。");
      return;
    }
    const recog = new Ctor();
    recog.lang = "ja-JP";
    recog.interimResults = true;
    recog.continuous = true;
    baseTextRef.current = text.trim();

    recog.onresult = (e) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results.item(i);
        if (res.isFinal) finalChunk += res[0].transcript;
        else interim += res[0].transcript;
      }
      const base = baseTextRef.current;
      const joined = [base, finalChunk].filter(Boolean).join("\n");
      setText(interim ? `${joined}${joined ? "\n" : ""}${interim}` : joined);
      if (finalChunk) baseTextRef.current = joined;
    };
    recog.onerror = () => {
      setStatus("うまく聞き取れませんでした。もう一度試すか、文字で入れてください。");
    };
    recog.onend = () => {
      setListening(false);
      setText((t) => t.trim());
    };

    recogRef.current = recog;
    setStatus("お話しください。終わったらもう一度ボタンを押してください。");
    setListening(true);
    recog.start();
  }

  // ---- 写真からよみとる（端末内 OCR） ----
  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じ写真を再選択できるように
    if (!file) return;
    setOcrPct(0);
    setStatus("写真の文字を読み取っています。少しお待ちください。");
    try {
      const out = await ocrImage(file, (r) => setOcrPct(Math.round(r * 100)));
      if (out.trim()) {
        appendText(out);
        setStatus("写真から文字を読み取りました。内容を確かめてください。");
      } else {
        setStatus("文字を読み取れませんでした。文字で入れるか、声で話してください。");
      }
    } catch {
      setStatus("写真の読み取りができませんでした。文字で入れるか、声で話してください。");
    } finally {
      setOcrPct(null);
    }
  }

  // ---- 送信前の確認（一拍） ----
  function tryProceed() {
    if (listening) recogRef.current?.stop();
    if (!text.trim()) {
      setStatus("まず、受け取った内容を入れてください。");
      return;
    }
    setShowConfirm(true);
  }

  function confirmSubmit() {
    setShowConfirm(false);
    onSubmit(text.trim());
  }

  return (
    <div>
      <h1 className="app-title">まもり</h1>
      <p className="app-sub">あやしいと思ったら、お金を動かす前に、まず見せてください。</p>

      <label className="label" htmlFor="situation">
        受け取った内容を、貼るか書いてください
      </label>
      <textarea
        id="situation"
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例：市役所から電話で、還付金があるのでATMへ行ってと言われた"
        aria-describedby="situation-hint"
      />
      <p id="situation-hint" className="hint">
        メッセージの文をそのまま貼り付けてもかまいません。
      </p>

      <div className="btn-row two">
        <button
          type="button"
          className={`btn ${listening ? "is-active" : "btn-secondary"}`}
          onClick={toggleVoice}
          aria-pressed={listening}
          disabled={busy || ocrPct !== null}
        >
          {listening ? "■ 聞き取りを止める" : "🎤 声で話す"}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={busy || listening || ocrPct !== null}
        >
          {ocrPct !== null ? `📷 読み取り中 ${ocrPct}%` : "📷 写真からよみとる"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          onChange={onPickPhoto}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      <p className="status" role="status" aria-live="polite">
        {status}
      </p>

      <hr className="divider" />

      <button
        type="button"
        className="btn btn-primary"
        onClick={tryProceed}
        disabled={busy}
      >
        この内容で調べる
      </button>

      {showConfirm && (
        <div
          className="sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="sheet">
            <h2 id="confirm-title" className="sheet-title">
              この内容で調べますか？
            </h2>
            <div className="sheet-quote">{text.trim()}</div>
            <div className="btn-row two">
              <button type="button" className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                もどる
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmSubmit}>
                調べる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
