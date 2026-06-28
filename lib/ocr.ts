// 端末内 OCR（CLAUDE.md §10 プライバシー：画像はサーバへ送らず端末で文字化）。
// tesseract.js は重いので、写真ボタンを押したときだけ動的 import する。
// 失敗しても致命的にしない＝呼び出し側が「貼る／声」へ案内する（計画 §3 Task3）。

export async function ocrImage(
  file: File | Blob,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("jpn", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    // 余分な空白を整える（日本語 OCR は空白が混ざりやすい）
    return data.text
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    await worker.terminate();
  }
}
