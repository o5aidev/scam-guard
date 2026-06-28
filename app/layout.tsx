import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "まもり｜詐欺かな？と思ったら",
  description:
    "あやしい電話・メッセージ・契約を、お金が動く前に一度立ち止まって確かめるためのアプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 高齢者が拡大できるようズームを無効化しない（アクセシビリティ）
  maximumScale: 5,
  userScalable: true,
  // ホーム追加・スタンドアロン起動時の枠色（manifest の theme_color と揃える）
  themeColor: "#0b5cab",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
