import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Next.js の "@/..." を tsconfig と同じくリポジトリ直下に解決
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // judge の検証は実 API を叩くため時間がかかる。十分なタイムアウトを取る。
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // .env を読み込む（ANTHROPIC_API_KEY）
    setupFiles: ["./test/setup.ts"],
  },
});
