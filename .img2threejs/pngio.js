// 순수 node(zlib)만으로 RGBA PNG 읽고 쓰기. 외부 의존성 없음.
const fs = require('fs');
const zlib = require('zlib');

function decode(path) {
  const b = fs.readFileSync(path);
  let o = 8, w, h, ct, bd, idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8);
    if (t === 'IHDR') { w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12); bd = b[o + 16]; ct = b[o + 17]; }
    if (t === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len));
    if (t === 'IEND') break;
    o += 12 + len;
  }
  if (ct !== 6 || bd !== 8) throw new Error(`unsupported PNG colorType=${ct} bitDepth=${bd}`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp;
  const d = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos + x];
      const A = x >= bpp ? d[y * stride + x - bpp] : 0;
      const B = y > 0 ? d[(y - 1) * stride + x] : 0;
      const C = (x >= bpp && y > 0) ? d[(y - 1) * stride + x - bpp] : 0;
      let v;
      switch (f) {
        case 0: v = cur; break;
        case 1: v = cur + A; break;
        case 2: v = cur + B; break;
        case 3: v = cur + ((A + B) >> 1); break;
        default: {
          const p = A + B - C, pa = Math.abs(p - A), pb = Math.abs(p - B), pc = Math.abs(p - C);
          v = cur + (pa <= pb && pa <= pc ? A : pb <= pc ? B : C);
        }
      }
      d[y * stride + x] = v & 255;
    }
    pos += stride;
  }
  return { w, h, d, stride };
}

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// img = {w, h, d(Buffer RGBA), stride}
function encode(path, img) {
  const { w, h, d } = img, stride = img.stride || w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                       // filter: none
    d.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
  return path;
}

// 큰 이미지를 에이전트가 눈으로 확인할 수 있게 축소 (박스 필터, 알파 가중)
function downscale(img, maxSide) {
  const f = Math.max(1, Math.ceil(Math.max(img.w, img.h) / maxSide));
  const W = Math.floor(img.w / f), H = Math.floor(img.h / f), stride = W * 4;
  const out = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) {
      const i = (y * f + dy) * img.stride + (x * f + dx) * 4;
      const al = img.d[i + 3] / 255;
      r += img.d[i] * al; g += img.d[i + 1] * al; b += img.d[i + 2] * al;
      a += img.d[i + 3]; n++;
    }
    const o = y * stride + x * 4, aa = a / n;
    const w8 = aa > 0 ? (a / 255) : 1;
    out[o] = Math.round(r / w8); out[o + 1] = Math.round(g / w8);
    out[o + 2] = Math.round(b / w8); out[o + 3] = Math.round(aa);
  }
  return { w: W, h: H, d: out, stride };
}

// 투명 PNG를 배경색 위에 합성해서 보이게 (알파 확인용)
function onBackground(img, hex) {
  const R = parseInt(hex.slice(1, 3), 16), G = parseInt(hex.slice(3, 5), 16), B = parseInt(hex.slice(5, 7), 16);
  const out = Buffer.from(img.d);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3] / 255;
    out[i] = Math.round(out[i] * a + R * (1 - a));
    out[i + 1] = Math.round(out[i + 1] * a + G * (1 - a));
    out[i + 2] = Math.round(out[i + 2] * a + B * (1 - a));
    out[i + 3] = 255;
  }
  return { w: img.w, h: img.h, d: out, stride: img.stride };
}

module.exports = { decode, encode, downscale, onBackground };
