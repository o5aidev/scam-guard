import type { MetadataRoute } from "next";

// PWA マニフェスト（CLAUDE.md §9 / README Task5）。
// 高齢者の導入摩擦を最小化するため、ホーム画面に追加して「アプリのように」起動できるようにする。
// バックエンド無し＝静的ホスティング可。Next が <link rel="manifest"> を自動挿入する。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "まもり｜詐欺かな？と思ったら",
    short_name: "まもり",
    description:
      "あやしい電話・メッセージ・契約を、お金が動く前に一度立ち止まって確かめるためのアプリ。",
    lang: "ja",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb", // globals.css の --bg
    theme_color: "#0b5cab", // globals.css の --primary
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
