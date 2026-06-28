// PWA アイコン生成（依存ゼロ・Node 標準の zlib だけで PNG を書き出す）。
//   node scripts/gen-icons.mjs
// 生成物（コミット対象の静的アセット）:
//   public/icon-192.png / public/icon-512.png / public/icon-maskable-512.png … manifest 用
//   app/apple-icon.png（180）… iOS ホーム追加用 / app/icon.png（256）… favicon
// 図柄: ブランド青(#0b5cab)の盾＋白チェック。手描きで「まもり（守る）」を表す。

import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- PNG エンコード（RGBA・フィルタ0） ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- 図柄を描く ----
const BG = [11, 92, 171, 255]; // #0b5cab
const WHITE = [255, 255, 255, 255];

function distSeg(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1, wx = px - x1, wy = py - y1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

function draw(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  // maskable は OS が角を丸めるので安全域を小さめに。通常アイコンは大きめに。
  const safe = maskable ? 0.60 : 0.76;
  const sw = (size * safe) / 2; // 盾の半幅
  const top = size * (0.5 - safe * 0.46);
  const shoulder = size * (0.5 - safe * 0.14);
  const bottom = size * (0.5 + safe * 0.5);

  const inShield = (x, y) => {
    if (y < top || y > bottom) return false;
    const hw = y <= shoulder ? sw : sw * (1 - (y - shoulder) / (bottom - shoulder));
    return Math.abs(x - cx) <= hw;
  };

  // チェックマーク（盾の中央）。2線分への距離で太さを出す。
  const ax = cx - sw * 0.42, ay = size * 0.50;
  const bx = cx - sw * 0.08, by = size * 0.50 + sw * 0.34;
  const ex = cx + sw * 0.52, ey = size * 0.50 - sw * 0.34;
  const thick = sw * 0.18;

  const set = (x, y, c) => {
    const i = (y * size + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = c[3];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(x, y, BG); // 全面ブランド青（maskable の安全域を満たす）
      if (inShield(x, y)) {
        set(x, y, WHITE);
        const d = Math.min(distSeg(x, y, ax, ay, bx, by), distSeg(x, y, bx, by, ex, ey));
        if (d <= thick) set(x, y, BG); // 白い盾の上に青いチェック
      }
    }
  }
  return buf;
}

function write(relPath, size, maskable = false) {
  const png = encodePng(size, draw(size, maskable));
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, png);
  console.log(`wrote ${relPath} (${size}x${size}${maskable ? " maskable" : ""})`);
}

mkdirSync(join(ROOT, "public"), { recursive: true });
write("public/icon-192.png", 192);
write("public/icon-512.png", 512);
write("public/icon-maskable-512.png", 512, true);
write("app/apple-icon.png", 180);
write("app/icon.png", 256);
