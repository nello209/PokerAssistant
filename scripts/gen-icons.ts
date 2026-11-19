// Genera le icone PNG (discrete: una piccola griglia, nessun simbolo del poker). Uso: node scripts/gen-icons.ts
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(size: number, px: (x: number, y: number) => [number, number, number]) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]);
}

const BG: [number, number, number] = [11, 13, 16];
const GOLD: [number, number, number] = [201, 162, 74];
const DIM: [number, number, number] = [38, 46, 55];
// 4x4 griglia "a scalino" (ricorda una matrice di range)
const PATTERN = [
  [1, 1, 1, 1],
  [1, 1, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 0, 0],
];
function icon(size: number, safe: number) {
  const area = size * safe, start = (size - area) / 2, n = 4, gap = area * 0.06, cell = (area - gap * (n - 1)) / n, rad = cell * 0.18;
  return png(size, (x, y) => {
    const lx = x - start, ly = y - start;
    if (lx < 0 || ly < 0 || lx >= area || ly >= area) return BG;
    const cx = Math.floor(lx / (cell + gap)), cy = Math.floor(ly / (cell + gap));
    const ox = lx - cx * (cell + gap), oy = ly - cy * (cell + gap);
    if (cx >= n || cy >= n || ox > cell || oy > cell) return BG;
    // angoli arrotondati
    const dx = Math.max(rad - ox, ox - (cell - rad), 0), dy = Math.max(rad - oy, oy - (cell - rad), 0);
    if (dx * dx + dy * dy > rad * rad) return BG;
    return PATTERN[cy][cx] ? GOLD : DIM;
  });
}

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(dir + 'icon-192.png', icon(192, 0.62));
writeFileSync(dir + 'icon-512.png', icon(512, 0.62));
writeFileSync(dir + 'icon-maskable-512.png', icon(512, 0.5));
writeFileSync(dir + 'apple-touch-icon.png', icon(180, 0.6));
writeFileSync(dir + 'favicon.png', icon(64, 0.8));
console.log('Icone scritte in', dir);
