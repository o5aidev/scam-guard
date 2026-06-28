// APIキーの保管（端末内のみ）。
// 方針（憲法 §10 / README）: 利用者が入れたキーは、この端末の localStorage だけに置く。
// 運営者のサーバへは一切送らない（判定時に Anthropic へ直接送るだけ）。
// ＝ 運営者はキーも相談内容も受け取らず・見られない。何かあっても利用者に閉じる。

const STORAGE_KEY = "scamguard.anthropic_api_key";

// 形式の軽い検証（純関数・テスト可能）。Anthropic のキーは "sk-ant-" で始まる。
// ここは「貼り間違い」を弾くための門番であって、有効性は実呼び出しで分かる。
export function isLikelyAnthropicKey(key: string): boolean {
  const k = key.trim();
  return k.startsWith("sk-ant-") && k.length >= 20;
}

export function loadApiKey(): string | null {
  if (typeof window === "undefined") return null; // SSR では触れない
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null; // プライベートモード等で localStorage 不可でも落とさない
  }
}

export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // 保存できない環境（容量・権限）でも例外で UI を壊さない
  }
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
